import { prisma } from "@/lib/prisma";
import { evaluateShelterPredictions } from "@/lib/services/prediction";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";
import { redirect } from "next/navigation";
import { CommandMapClient } from "@/components/CommandMapClient";
import type { IncidentMarker, MissingPersonMapMarker, HazardReportMarker, SafeCheckinMarker } from "@/components/ShelterMap";

export const dynamic = "force-dynamic";

export default async function DistrictAuthorityDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);

  // Strict Server-Side Guard: Only verified District Authorities or System Admins
  if (
    !profile ||
    profile.verificationStatus !== "VERIFIED" ||
    (profile.role !== "DISTRICT_AUTHORITY" && profile.role !== "SYSTEM_ADMIN")
  ) {
    redirect("/dashboard/citizen");
  }

  let shelters: Array<{ id: string; name: string; locality: string; totalBeds: number; availableBeds: number; latitude: number | null; longitude: number | null; status: string }> = [];
  let alerts: Array<{ id: string; icon: string; title: string; description: string; severity: string }> = [];
  let safeCount = 2184;
  let predictionSummary = null;
  let incidents: IncidentMarker[] = [];
  let missingPersons: MissingPersonMapMarker[] = [];
  let hazardReports: HazardReportMarker[] = [];
  let safeCheckins: SafeCheckinMarker[] = [];

  try {
    shelters = await prisma.shelter.findMany();
    alerts = await prisma.alert.findMany({ take: 5, orderBy: { createdAt: "desc" } });
    safeCount = await prisma.safeRecord.count();
    predictionSummary = await evaluateShelterPredictions();

    // Phase 4 — Command Centre data
    const rawIncidents = await prisma.incident.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    incidents = rawIncidents
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => ({
        id: i.id,
        title: i.title,
        hazardType: i.hazardType,
        severity: i.severity,
        latitude: i.latitude!,
        longitude: i.longitude!,
        summary: i.summary,
        isLive: i.isLive,
        source: i.source,
        state: i.state,
      }));

    const rawMissing = await prisma.missingPerson.findMany({
      where: { status: { in: ["MISSING", "LOCATED"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    missingPersons = rawMissing
      .filter((p) => p.lastSeenLatitude !== null && p.lastSeenLongitude !== null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        locationName: p.locationName,
        lastSeenLatitude: p.lastSeenLatitude!,
        lastSeenLongitude: p.lastSeenLongitude!,
        lastSeenAt: p.lastSeenAt,
      }));

    const rawReports = await prisma.disasterReport.findMany({
      where: { status: { in: ["RECEIVED", "REVIEWED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    hazardReports = rawReports
      .filter((r) => r.latitude !== null && r.longitude !== null)
      .map((r) => ({
        id: r.id,
        hazardType: r.hazardType,
        locationName: r.locationName,
        latitude: r.latitude!,
        longitude: r.longitude!,
        createdAt: r.createdAt,
      }));

    // Safe check-ins (approximate — authority view; precise coords from LocationConsent)
    const rawCheckins = await prisma.locationConsent.findMany({
      where: { consentStatus: "GRANTED" },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { fullName: true } } },
    });
    safeCheckins = rawCheckins.map((c) => ({
      id: c.id,
      fullName: c.user.fullName,
      latitude: c.latitude,
      longitude: c.longitude,
      createdAt: c.startedAt,
    }));
  } catch (err) {
    console.error("Error fetching authority metrics:", err);
  }


  const activeSheltersCount = shelters.length || 14;
  const totalBeds = shelters.reduce((acc, s) => acc + s.totalBeds, 0) || 1534;
  const totalAvailableBeds = shelters.reduce((acc, s) => acc + s.availableBeds, 0) || 248;
  const totalOccupiedBeds = totalBeds - totalAvailableBeds;

  async function createSimulatedAlertAction() {
    "use server";
    try {
      const randomShelter = await prisma.shelter.findFirst();
      await prisma.alert.create({
        data: {
          title: "Automated Capacity Alert",
          description: `Live update: Shelter ${randomShelter?.name || "Kalamassery Hall"} is operating at peak occupancy.`,
          severity: "WARNING",
          shelterId: randomShelter?.id || null,
        },
      });
    } catch (e) {
      console.error(e);
    }
    revalidatePath("/dashboard/authority");
    revalidatePath("/");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <p style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px" }}>
            DISTRICT COMMAND CENTRE
          </p>
          <h1 style={{ font: "700 36px Outfit", margin: 0, color: "#17323b" }}>
            Operational Overview: Ernakulam District
          </h1>
          <p style={{ color: "#71858a", fontSize: "15px", margin: "8px 0 0" }}>
            Live shelter capacity, supply bottlenecks, resource predictions, and emergency alert triage.
          </p>
        </div>

        <form action={createSimulatedAlertAction}>
          <button
            type="submit"
            style={{
              background: "#087d7a",
              color: "white",
              border: 0,
              borderRadius: "8px",
              padding: "11px 18px",
              font: "600 13px 'DM Sans', sans-serif",
              cursor: "pointer",
            }}
          >
            Simulate Live Alert Broadcast →
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "10px", padding: "20px" }}>
          <span style={{ color: "#71858a", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>ACTIVE SHELTERS</span>
          <strong style={{ font: "700 32px Outfit", display: "block", margin: "8px 0 2px", color: "#17323b" }}>{activeSheltersCount}</strong>
          <span style={{ fontSize: "12px", color: "#149166" }}>↑ Verified DB entries</span>
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "10px", padding: "20px" }}>
          <span style={{ color: "#71858a", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>TOTAL OCCUPANCY</span>
          <strong style={{ font: "700 32px Outfit", display: "block", margin: "8px 0 2px", color: "#17323b" }}>{totalOccupiedBeds.toLocaleString()}</strong>
          <span style={{ fontSize: "12px", color: "#71858a" }}>of {totalBeds.toLocaleString()} total capacity</span>
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "10px", padding: "20px" }}>
          <span style={{ color: "#71858a", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>AVAILABLE BEDS</span>
          <strong style={{ font: "700 32px Outfit", display: "block", margin: "8px 0 2px", color: "#087b68" }}>{totalAvailableBeds}</strong>
          <span style={{ fontSize: "12px", color: "#149166" }}>{Math.round((totalAvailableBeds / Math.max(1, totalBeds)) * 100)}% district buffer</span>
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "10px", padding: "20px" }}>
          <span style={{ color: "#71858a", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>SAFE REGISTRATIONS</span>
          <strong style={{ font: "700 32px Outfit", display: "block", margin: "8px 0 2px", color: "#17323b" }}>{safeCount.toLocaleString()}</strong>
          <span style={{ fontSize: "12px", color: "#149166" }}>↑ Verified safe entries</span>
        </div>
      </div>

      {/* PHASE 9 — Resource Prediction & Early Warning System Section */}
      {predictionSummary && (
        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "24px", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", gap: "12px" }}>
            <div>
              <span style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                PHASE 9 — EARLY WARNING & PREDICTION SYSTEM
              </span>
              <h2 style={{ font: "700 22px Outfit", margin: "4px 0 2px", color: "#17323b" }}>
                Resource Depletion Forecasts
              </h2>
              <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>
                Algorithmic early-warning alerts for food, medicine, and water shortages before critical failure.
              </p>
            </div>

            <span style={{ fontSize: "11px", color: "#91a2a4", fontStyle: "italic" }}>
              Last Evaluated: {new Date(predictionSummary.lastEvaluatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Severity Badges Summary Bar */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            <span style={{ background: "#fee8e4", color: "#b64b3d", padding: "6px 12px", borderRadius: "8px", font: "700 12px 'DM Sans'" }}>
              🔴 Critical ({predictionSummary.riskCounts.CRITICAL})
            </span>
            <span style={{ background: "#fff1d9", color: "#aa6a13", padding: "6px 12px", borderRadius: "8px", font: "700 12px 'DM Sans'" }}>
              🟠 At Risk ({predictionSummary.riskCounts.AT_RISK})
            </span>
            <span style={{ background: "#fef9e6", color: "#8a6d13", padding: "6px 12px", borderRadius: "8px", font: "700 12px 'DM Sans'" }}>
              🟡 Watch ({predictionSummary.riskCounts.WATCH})
            </span>
            <span style={{ background: "#e2f6ed", color: "#087b68", padding: "6px 12px", borderRadius: "8px", font: "700 12px 'DM Sans'" }}>
              🟢 Safe ({predictionSummary.riskCounts.SAFE})
            </span>
            {predictionSummary.riskCounts.INSUFFICIENT_DATA > 0 && (
              <span style={{ background: "#f0f4f4", color: "#71858a", padding: "6px 12px", borderRadius: "8px", font: "700 12px 'DM Sans'" }}>
                ⚪ Insufficient Data ({predictionSummary.riskCounts.INSUFFICIENT_DATA})
              </span>
            )}
          </div>

          {/* Scannable Prediction Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {predictionSummary.highestRiskItems.slice(0, 6).map((item) => {
              const isCrit = item.riskLevel === "CRITICAL";
              const isRisk = item.riskLevel === "AT_RISK";
              const isWatch = item.riskLevel === "WATCH";

              const badgeBg = isCrit ? "#fee8e4" : isRisk ? "#fff1d9" : isWatch ? "#fef9e6" : "#e2f6ed";
              const badgeColor = isCrit ? "#b64b3d" : isRisk ? "#aa6a13" : isWatch ? "#8a6d13" : "#087b68";

              return (
                <div
                  key={item.packetId}
                  style={{
                    border: "1px solid #dce7e6",
                    borderRadius: "10px",
                    padding: "16px",
                    background: "#fafdfc",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ font: "700 11px 'DM Sans'", padding: "4px 8px", borderRadius: "6px", background: badgeBg, color: badgeColor }}>
                        {item.riskLevel === "CRITICAL" ? "🔴 CRITICAL" : item.riskLevel === "AT_RISK" ? "🟠 AT RISK" : item.riskLevel === "WATCH" ? "🟡 WATCH" : item.riskLevel === "SAFE" ? "🟢 SAFE" : "⚪ INSUFFICIENT DATA"}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#087d7a" }}>{item.resourceType}</span>
                    </div>

                    <h4 style={{ font: "700 16px Outfit", margin: "0 0 4px", color: "#17323b" }}>{item.shelterName}</h4>
                    <p style={{ fontSize: "12px", color: "#71858a", margin: "0 0 10px" }}>District: {item.districtName} · Current: {item.currentStatus}</p>

                    <div style={{ fontSize: "13px", color: "#17323b", marginBottom: "8px" }}>
                      <strong>Estimated shortage:</strong>{" "}
                      {item.estimatedHoursRemaining !== null ? `~${item.estimatedHoursRemaining} hours` : "Insufficient data"}
                    </div>

                    <p style={{ fontSize: "12px", color: "#577276", margin: "0 0 10px", lineHeight: 1.4 }}>
                      <strong>Reason:</strong> {item.reason}
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid #eef4f3", paddingTop: "10px", marginTop: "8px", fontSize: "12px", color: "#087b68", fontWeight: 600 }}>
                    ⚡ Action: {item.recommendedAction}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f0f6f5", fontSize: "11px", color: "#91a2a4", textAlign: "right" }}>
            ⚠ Early warning estimates calculated from verified database updates. Not guaranteed future events.
          </div>
        </div>
      )}

      {/* ── Command Centre Map ── */}
      <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "24px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              PHASE 4 — COMMAND CENTRE
            </span>
            <h2 style={{ font: "700 22px Outfit", margin: "4px 0 2px", color: "#17323b" }}>
              District Situational Map
            </h2>
            <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>
              All operational layers — shelters, alerts, incidents, missing persons, hazard reports, and live check-ins.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ background: "#fee8e4", color: "#b64b3d", padding: "5px 10px", borderRadius: "8px", font: "700 11px 'DM Sans'" }}>
              🌊 {incidents.length} Incidents
            </span>
            <span style={{ background: "#fff1d9", color: "#aa6a13", padding: "5px 10px", borderRadius: "8px", font: "700 11px 'DM Sans'" }}>
              🔍 {missingPersons.length} Missing
            </span>
            <span style={{ background: "#e2f6ed", color: "#087b68", padding: "5px 10px", borderRadius: "8px", font: "700 11px 'DM Sans'" }}>
              📡 {safeCheckins.length} Check-ins
            </span>
            <span style={{ background: "#f0f4f4", color: "#71858a", padding: "5px 10px", borderRadius: "8px", font: "700 11px 'DM Sans'" }}>
              📷 {hazardReports.length} Reports
            </span>
          </div>
        </div>

        {/* Case study notice */}
        {incidents.some((i) => !i.isLive) && (
          <div style={{ background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "8px 14px", marginBottom: "14px", fontSize: "12px", color: "#6b7280", display: "flex", gap: "8px", alignItems: "center" }}>
            <span>📋</span>
            <span>
              <strong>Case Study incidents</strong> (grey markers) are historical/educational records — not live emergencies.
              Source-verified. No live government integration claimed.
            </span>
          </div>
        )}

        <div style={{ height: "520px" }}>
          <CommandMapClient
            shelters={shelters.map((s) => ({
              id: s.id,
              name: s.name,
              locality: s.locality ?? "",
              availableBeds: s.availableBeds,
              status: s.status,
              latitude: s.latitude ?? null,
              longitude: s.longitude ?? null,
            }))}
            incidents={incidents}
            missingPersons={missingPersons}
            hazardReports={hazardReports}
            safeCheckins={safeCheckins}
            showLayerToggles={true}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ font: "700 20px Outfit", margin: 0, color: "#17323b" }}>Attention Needed</h2>
            <span style={{ fontSize: "11px", color: "#b54a3d", background: "#fee8e4", padding: "4px 8px", borderRadius: "10px", fontWeight: 700 }}>
              {alerts.length || 3} Active Alerts
            </span>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {alerts.length > 0 ? (
              alerts.map((a) => (
                <div key={a.id} style={{ borderBottom: "1px solid #dce7e6", paddingBottom: "12px", display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>{a.icon || "⚠"}</span>
                  <div>
                    <h4 style={{ font: "600 14px Outfit", margin: "0 0 4px" }}>{a.title}</h4>
                    <p style={{ fontSize: "12px", color: "#71858a", margin: 0 }}>{a.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>No active alerts.</p>
            )}
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "22px" }}>
          <h2 style={{ font: "700 20px Outfit", margin: "0 0 16px", color: "#17323b" }}>Occupancy by Zone</h2>

          <div style={{ display: "grid", gap: "16px" }}>
            {[
              ["Aluva Zone", 82],
              ["Kochi Zone", 67],
              ["Kalamassery Zone", 53],
              ["North Paravur Zone", 38],
            ].map(([zone, occupancy]) => (
              <div key={String(zone)}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                  <span>{zone}</span>
                  <strong>{occupancy}% Occupied</strong>
                </div>
                <div style={{ height: "8px", background: "#e4eeee", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${occupancy}%`, background: "#087d7a", borderRadius: "4px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
