import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch live summary stats
  let shelterCount = 0;
  let activeBeds = 0;
  let alertCount = 0;
  let missingCount = 0;

  try {
    const [shelters, alerts, missing] = await Promise.all([
      prisma.shelter.findMany({ select: { availableBeds: true } }),
      prisma.alert.count({ where: { status: "ACTIVE" } }),
      prisma.missingPerson.count({ where: { status: "MISSING" } }),
    ]);
    shelterCount = shelters.length;
    activeBeds = shelters.reduce((sum, s) => sum + s.availableBeds, 0);
    alertCount = alerts;
    missingCount = missing;
  } catch {
    /* non-fatal — show zeros */
  }

  const steps = [
    { emoji: "📢", title: "Get Alert", desc: "Receive real-time district warnings before disaster strikes", color: "#D94B3D" },
    { emoji: "🏠", title: "Find Safety", desc: "Locate verified open shelters with live bed availability", color: "#E39A2B" },
    { emoji: "📍", title: "I'm Safe", desc: "GPS check-in so family and relief teams can find you", color: "#087d7a" },
    { emoji: "❤️", title: "Reconnect", desc: "Search for missing family members through official registry", color: "#2563eb" },
    { emoji: "🎯", title: "Coordinate", desc: "Authorities get full command-centre situational awareness", color: "#7c1d1d" },
  ];

  const features = [
    {
      emoji: "📍",
      title: "GPS Safety Check-in",
      desc: "Share your location with relief coordinators. Choose once, 1 hour, or continuous. Works offline — syncs when connected.",
      color: "#2563eb",
      href: "/dashboard/citizen/safety-checkin",
      badge: "NEW",
    },
    {
      emoji: "🔍",
      title: "Find Someone / Missing Persons",
      desc: "Report a missing person or search the verified registry. Precise GPS only accessible to authorized authorities.",
      color: "#D94B3D",
      href: "/dashboard/citizen/missing-persons",
      badge: "NEW",
    },
    {
      emoji: "📷",
      title: "Emergency Camera Reports",
      desc: "Photo-document floods, road blocks, building damage. GPS-tagged and routed directly to district command.",
      color: "#7c1d1d",
      href: "/dashboard/citizen/report-hazard",
      badge: "NEW",
    },
    {
      emoji: "🏠",
      title: "Smart Shelter Discovery",
      desc: "Live bed capacity, food and medicine stock levels, directions. Verified data from district shelters.",
      color: "#087d7a",
      href: "/dashboard/citizen/shelters",
      badge: null,
    },
    {
      emoji: "🎯",
      title: "Authority Command Centre",
      desc: "Multi-layer situational map — shelters, alerts, incidents, missing persons, hazard reports, GPS check-ins.",
      color: "#7c1d1d",
      href: "/dashboard/authority",
      badge: "NEW",
    },
    {
      emoji: "🌊",
      title: "Case Study: Past Disasters",
      desc: "Nepal & Assam 2026 flood case studies on the command map. Labelled historical — no fabricated live data.",
      color: "#6b7280",
      href: "/dashboard/authority",
      badge: "CASE STUDY",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5FAF9", color: "#17323b", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header style={{ background: "#17323B", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ background: "#087D7A", color: "white", width: "36px", height: "36px", borderRadius: "8px", display: "grid", placeItems: "center", fontSize: "18px" }}>
            🛡️
          </span>
          <span style={{ font: "700 22px Outfit, sans-serif", color: "white" }}>SHAASTRA</span>
          <span style={{ color: "#4a9e9b", fontSize: "12px", fontWeight: 500 }}>Disaster Response Platform</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {user ? (
            <Link href="/dashboard/citizen" style={{ background: "#087D7A", color: "white", padding: "9px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ color: "white", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>Sign In</Link>
              <Link href="/login" style={{ background: "#087D7A", color: "white", padding: "9px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #17323B 0%, #0d4a48 100%)", color: "white", padding: "72px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <span style={{ background: "rgba(8,125,122,0.4)", color: "#7ee8e0", padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
            National Disaster Response System
          </span>
          <h1 style={{ font: "700 52px/1.1 Outfit, sans-serif", margin: "20px 0 16px" }}>
            When disaster strikes,<br />SHAASTRA connects you.
          </h1>
          <p style={{ fontSize: "17px", color: "#a0c8c6", marginBottom: "36px", lineHeight: 1.6 }}>
            Real-time shelter discovery, GPS safety check-in, missing person registry, and a district command centre — built for India's frontline disaster response.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={user ? "/dashboard/citizen" : "/login"} style={{ background: "#087D7A", color: "white", padding: "14px 28px", borderRadius: "10px", textDecoration: "none", font: "700 16px 'DM Sans'", display: "inline-block" }}>
              📍 I'm Safe — Check In Now
            </Link>
            <Link href={user ? "/dashboard/citizen/shelters" : "/login"} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "14px 28px", borderRadius: "10px", textDecoration: "none", font: "700 16px 'DM Sans'", display: "inline-block" }}>
              🏠 Find a Shelter
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section style={{ background: "white", borderBottom: "1px solid #dce7e6", padding: "24px 32px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", textAlign: "center" }}>
          {[
            { label: "Active Shelters", value: shelterCount || "—", color: "#087d7a" },
            { label: "Available Beds", value: activeBeds || "—", color: "#087d7a" },
            { label: "Active Alerts", value: alertCount, color: alertCount > 0 ? "#D94B3D" : "#087d7a" },
            { label: "Missing Persons", value: missingCount, color: missingCount > 0 ? "#E39A2B" : "#087d7a" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ font: "700 34px Outfit, sans-serif", color }}>{value}</div>
              <div style={{ fontSize: "12px", color: "#71858a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 5-step workflow */}
      <section style={{ padding: "64px 32px", background: "#F5FAF9" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <p style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", textTransform: "uppercase", margin: "0 0 8px" }}>HOW IT WORKS</p>
          <h2 style={{ font: "700 34px Outfit, sans-serif", margin: "0 0 40px", color: "#17323b" }}>5 steps from danger to safety</h2>
          <div style={{ display: "flex", gap: "0", flexWrap: "wrap", position: "relative" }}>
            {steps.map((step, i) => (
              <div key={step.title} style={{ flex: "1 1 180px", minWidth: "160px", textAlign: "center", padding: "0 12px 24px", position: "relative" }}>
                {i < steps.length - 1 && (
                  <div style={{ position: "absolute", top: "28px", right: "-10px", fontSize: "20px", color: "#dce7e6", fontWeight: 700, zIndex: 1 }}>→</div>
                )}
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: step.color, color: "white", fontSize: "22px", display: "grid", placeItems: "center", margin: "0 auto 14px", boxShadow: `0 4px 16px ${step.color}40` }}>
                  {step.emoji}
                </div>
                <div style={{ font: "700 15px Outfit, sans-serif", color: "#17323b", marginBottom: "6px" }}>{step.title}</div>
                <div style={{ fontSize: "12px", color: "#71858a", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ padding: "0 32px 64px", background: "#F5FAF9" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <p style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", textTransform: "uppercase", margin: "0 0 8px" }}>FEATURES</p>
          <h2 style={{ font: "700 34px Outfit, sans-serif", margin: "0 0 32px", color: "#17323b" }}>What SHAASTRA gives you</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {features.map((f) => (
              <div key={f.title} style={{ background: "white", border: "1px solid #dce7e6", borderTop: `4px solid ${f.color}`, borderRadius: "12px", padding: "22px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "28px" }}>{f.emoji}</span>
                  {f.badge && (
                    <span style={{
                      background: f.badge === "NEW" ? "#e2f6ed" : f.badge === "CASE STUDY" ? "#f0f4f4" : "#fff1d9",
                      color: f.badge === "NEW" ? "#087b68" : f.badge === "CASE STUDY" ? "#6b7280" : "#aa6a13",
                      fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", letterSpacing: "0.5px",
                    }}>
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 style={{ font: "700 16px Outfit, sans-serif", margin: "0 0 8px", color: "#17323b" }}>{f.title}</h3>
                <p style={{ fontSize: "13px", color: "#71858a", margin: "0 0 16px", lineHeight: 1.5, flex: 1 }}>{f.desc}</p>
                <Link href={user ? f.href : "/login"} style={{ color: f.color, fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                  {user ? "Open →" : "Sign in to use →"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case study banner */}
      <section style={{ padding: "0 32px 64px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "28px 32px", display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <span style={{ background: "#f0f4f4", color: "#6b7280", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px" }}>📋 CASE STUDY</span>
              <span style={{ background: "#f0f4f4", color: "#6b7280", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px" }}>HISTORICAL EVENT</span>
              <span style={{ background: "#fee8e4", color: "#b64b3d", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px" }}>NOT LIVE</span>
            </div>
            <h3 style={{ font: "700 20px Outfit, sans-serif", margin: "0 0 8px", color: "#17323b" }}>Nepal & Assam Floods 2026</h3>
            <p style={{ fontSize: "13px", color: "#71858a", margin: "0 0 16px", lineHeight: 1.6 }}>
              Real-world flood scenarios visible on the Authority Command Centre map. Sourced from Reuters, UN OCHA, and ASDMA public situation reports.
              Clearly labelled as case studies — no fabricated live data, no SACHET integration claimed.
            </p>
            <div style={{ fontSize: "12px", color: "#91a2a4", fontStyle: "italic" }}>
              Source: Reuters / UN OCHA / ASDMA · For training and system demonstration purposes only.
            </div>
          </div>
          <Link href={user ? "/dashboard/authority" : "/login"} style={{ background: "#17323b", color: "white", padding: "12px 20px", borderRadius: "10px", textDecoration: "none", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", alignSelf: "center" }}>
            View on Map →
          </Link>
        </div>
      </section>

      {/* Security notice */}
      <section style={{ padding: "0 32px 64px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", background: "#e2f6ed", border: "1px solid #b0e0d0", borderRadius: "12px", padding: "20px 28px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "24px" }}>🔒</span>
            <div>
              <h4 style={{ font: "700 16px Outfit, sans-serif", margin: "0 0 6px", color: "#17323b" }}>Your privacy is protected by design</h4>
              <p style={{ fontSize: "13px", color: "#577276", margin: 0, lineHeight: 1.6 }}>
                Precise GPS coordinates are <strong>never shown publicly</strong>. Exact location is only accessible to verified District Authorities.
                Citizens can revoke location consent at any time. No service-role keys in the browser. All privileged actions are server-enforced.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#17323B", color: "#4a9e9b", padding: "28px 32px", textAlign: "center", fontSize: "12px" }}>
        <div>SHAASTRA · National Disaster Response Platform · Built for India</div>
        <div style={{ marginTop: "6px", color: "#2e6e6b" }}>
          Not affiliated with NDMA, SACHET, or any government body. Case studies are for demonstration purposes only.
        </div>
      </footer>
    </div>
  );
}
