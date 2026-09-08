import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GpsCheckin } from "@/components/GpsCheckin";

export const dynamic = "force-dynamic";

export default async function SafetyCheckinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Breadcrumb / Back Link */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/dashboard/citizen"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#087d7a",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span>←</span> Back to Citizen Portal
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <p
          style={{
            color: "#087d7a",
            font: "700 11px 'DM Sans', sans-serif",
            letterSpacing: "1.7px",
            margin: "0 0 6px",
            textTransform: "uppercase",
          }}
        >
          CITIZEN RELIEF & SEARCH COORDINATION
        </p>
        <h1
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: "34px",
            margin: "0 0 8px",
            color: "#17323b",
            lineHeight: 1.2,
          }}
        >
          GPS Safety Check-in
        </h1>
        <p style={{ color: "#71858a", fontSize: "16px", margin: 0, lineHeight: 1.5 }}>
          Share your real-time location securely with verified disaster relief coordinators and search & rescue teams.
        </p>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "28px" }}>
        {/* GPS Checkin Interactive Component Card */}
        <div>
          <GpsCheckin />
        </div>

        {/* How It Works Section */}
        <div
          style={{
            background: "white",
            border: "1px solid #dce7e6",
            borderRadius: "12px",
            padding: "28px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <span style={{ fontSize: "22px" }}>🧭</span>
            <h2
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
                fontSize: "20px",
                color: "#17323b",
                margin: 0,
              }}
            >
              How It Works
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                padding: "18px",
                background: "#f7fbfa",
                borderRadius: "10px",
                border: "1px solid #e4efee",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#087d7a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "14px",
                  marginBottom: "12px",
                }}
              >
                1
              </div>
              <h3
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#17323b",
                  margin: "0 0 6px",
                }}
              >
                Grant Browser Permission
              </h3>
              <p style={{ fontSize: "14px", color: "#577276", margin: 0, lineHeight: 1.5 }}>
                Grant location permission when prompted by your browser so SHAASTRA can read high-accuracy GPS coordinates.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                padding: "18px",
                background: "#f7fbfa",
                borderRadius: "10px",
                border: "1px solid #e4efee",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#087d7a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "14px",
                  marginBottom: "12px",
                }}
              >
                2
              </div>
              <h3
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#17323b",
                  margin: "0 0 6px",
                }}
              >
                Choose Sharing Duration
              </h3>
              <p style={{ fontSize: "14px", color: "#577276", margin: 0, lineHeight: 1.5 }}>
                Select how long to broadcast your location: once for a point-in-time check-in, 1 hour during evacuation, or continuously until safe.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                padding: "18px",
                background: "#f7fbfa",
                borderRadius: "10px",
                border: "1px solid #e4efee",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#087d7a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "14px",
                  marginBottom: "12px",
                }}
              >
                3
              </div>
              <h3
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#17323b",
                  margin: "0 0 6px",
                }}
              >
                Relief Coordination & Family Notification
              </h3>
              <p style={{ fontSize: "14px", color: "#577276", margin: 0, lineHeight: 1.5 }}>
                District disaster authorities can locate you on GIS tactical maps, and your registered family members can see you safely checked in.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Notice Card */}
        <div
          style={{
            background: "#edf7f5",
            border: "1px solid #bce2dc",
            borderRadius: "12px",
            padding: "20px 24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <span style={{ fontSize: "24px", flexShrink: 0, marginTop: "2px" }}>🔒</span>
          <div>
            <h4
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
                fontSize: "15px",
                color: "#087d7a",
                margin: "0 0 4px",
              }}
            >
              Strict Privacy & Security Guarantee
            </h4>
            <p style={{ fontSize: "13px", color: "#365c59", margin: 0, lineHeight: 1.6 }}>
              Precise coordinates are never shown publicly. Only verified district authorities, emergency NDRF/SDRF commanders, and verified shelter managers can access your coordinates during active emergencies. You maintain full ownership and can revoke location sharing at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
