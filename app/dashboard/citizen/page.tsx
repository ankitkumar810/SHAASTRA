import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { EmergencyAlertBanner, type AlertCardProps } from "@/components/EmergencyAlertBanner";

export const dynamic = "force-dynamic";

export default async function CitizenDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shelters: Array<{
    id: string;
    name: string;
    locality: string;
    availableBeds: number;
    totalBeds: number;
    foodStockStatus: string;
    medicineStockStatus: string;
    status: string;
  }> = [];

  let alerts: AlertCardProps[] = [];

  try {
    shelters = await prisma.shelter.findMany({
      take: 6,
      orderBy: { availableBeds: "desc" },
    });

    const rawAlerts = await prisma.alert.findMany({
      take: 3,
      where: { status: "ACTIVE" },
      include: { district: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    alerts = rawAlerts.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      severity: (a.severity as "CRITICAL" | "WARNING" | "INFO") || "WARNING",
      districtName: a.district?.name || "Ernakulam District",
      source: "NDMA / District Control Room",
      issuedAt: a.createdAt,
      actionUrl: "/dashboard/citizen/shelters",
      actionLabel: "Find Open Shelter →",
    }));
  } catch (err) {
    console.error("Database fetch error for shelters/alerts:", err);
  }

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px", textTransform: "uppercase" }}>
          CITIZEN DISASTER PORTAL
        </p>
        <h1 style={{ font: "700 36px Outfit", margin: 0, color: "#17323b" }}>
          Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Citizen"}
        </h1>
        <p style={{ color: "#71858a", fontSize: "15px", margin: "8px 0 0" }}>
          Ernakulam District Relief Operations · Real-time status and assistance
        </p>
      </div>

      {/* SACHET-Inspired Emergency Alert Banner */}
      <EmergencyAlertBanner alerts={alerts} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "white", border: "1px solid #dce7e6", borderTop: "4px solid #087d7a", borderRadius: "10px", padding: "20px" }}>
          <span style={{ fontSize: "24px" }}>⌂</span>
          <h3 style={{ font: "600 16px Outfit", margin: "10px 0 4px" }}>Find Nearby Shelter</h3>
          <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>View open shelters with live bed and food availability.</p>
          <Link href="/dashboard/citizen/shelters" style={{ display: "inline-block", marginTop: "12px", color: "#087d7a", fontWeight: 600, fontSize: "13px", textDecoration: "none" }}>
            Search Shelters →
          </Link>
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderTop: "4px solid #e89d2e", borderRadius: "10px", padding: "20px" }}>
          <span style={{ fontSize: "24px" }}>♡</span>
          <h3 style={{ font: "600 16px Outfit", margin: "10px 0 4px" }}>Family Reconnection</h3>
          <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>Mark yourself safe or search for a missing family member.</p>
          <Link href="/#family" style={{ display: "inline-block", marginTop: "12px", color: "#087d7a", fontWeight: 600, fontSize: "13px", textDecoration: "none" }}>
            Open Family Registry →
          </Link>
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderTop: "4px solid #df6957", borderRadius: "10px", padding: "20px" }}>
          <span style={{ fontSize: "24px" }}>⚑</span>
          <h3 style={{ font: "600 16px Outfit", margin: "10px 0 4px" }}>Report Disaster Hazard</h3>
          <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>Submit a location-aware report for flooding or blocked roads.</p>
          <span style={{ display: "inline-block", marginTop: "12px", color: "#087d7a", fontWeight: 600, fontSize: "13px" }}>
            Submit Report →
          </span>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "24px" }}>
        <h2 style={{ font: "700 20px Outfit", margin: "0 0 16px", color: "#17323b" }}>Verified Relief Shelters Nearby</h2>

        {shelters.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {shelters.map((shelter) => (
              <div key={shelter.id} style={{ border: "1px solid #dce7e6", borderRadius: "8px", padding: "16px", background: "#fafdfc" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "10px",
                    color: shelter.status === "OPEN" ? "#087b68" : "#aa6a13",
                    background: shelter.status === "OPEN" ? "#e2f6ed" : "#fff1d9",
                    float: "right",
                  }}
                >
                  {shelter.status}
                </span>
                <h4 style={{ font: "600 15px Outfit", margin: "0 0 6px" }}>{shelter.name}</h4>
                <p style={{ fontSize: "12px", color: "#71858a", margin: "0 0 12px" }}>⌖ {shelter.locality}</p>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#17323b" }}>
                  {shelter.availableBeds} beds available (out of {shelter.totalBeds})
                </div>
                <div style={{ fontSize: "12px", color: "#71858a", marginTop: "6px" }}>
                  Food: {shelter.foodStockStatus} · Medicine: {shelter.medicineStockStatus}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#71858a", fontSize: "14px" }}>Loading verified shelters...</p>
        )}
      </div>
    </div>
  );
}
