import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getDashboardPathForRole } from "@/lib/services/auth";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { LanguageSelector } from "@/components/LanguageSelector";
import Link from "next/link";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  const userRole = profile?.role || "CITIZEN";
  const userDistrict = profile?.district?.name || "Ernakulam";
  const userName = profile?.fullName || user.email?.split("@")[0] || "User";
  const verificationStatus = profile?.verificationStatus || "VERIFIED";

  return (
    <div className="app-shell" style={{ minHeight: "100vh", background: "#f7fbfa", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #dce7e6",
          padding: "16px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", color: "#17323b" }}>
            <span className="brand-mark" style={{ background: "#087d7a", color: "white", width: "32px", height: "32px", borderRadius: "8px", display: "grid", placeItems: "center", fontWeight: "bold" }}>S</span>
            <span style={{ font: "700 20px Outfit" }}>SHAASTRA</span>
          </Link>

          <nav style={{ display: "flex", gap: "8px" }}>
            <Link
              href="/dashboard/citizen"
              style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: "#17323b", background: "#e9f7f4" }}
            >
              Citizen Portal
            </Link>

            {verificationStatus === "VERIFIED" && (userRole === "SHELTER_ADMIN" || userRole === "DISTRICT_AUTHORITY" || userRole === "SYSTEM_ADMIN") && (
              <Link
                href="/dashboard/shelter"
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: "#17323b" }}
              >
                Shelter Admin
              </Link>
            )}

            {verificationStatus === "VERIFIED" && (userRole === "DISTRICT_AUTHORITY" || userRole === "SYSTEM_ADMIN") && (
              <Link
                href="/dashboard/authority"
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: "#17323b" }}
              >
                District Command
              </Link>
            )}

            {verificationStatus === "VERIFIED" && userRole === "SYSTEM_ADMIN" && (
              <Link
                href="/dashboard/admin"
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", color: "#17323b" }}
              >
                System Admin
              </Link>
            )}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right", fontSize: "13px" }}>
            <span style={{ fontWeight: 600, display: "block" }}>{userName}</span>
            <span style={{ color: "#71858a", fontSize: "11px" }}>
              {userDistrict} District ·{" "}
              <span
                style={{
                  fontWeight: "bold",
                  color: userRole === "SYSTEM_ADMIN" ? "#b64b3d" : userRole === "DISTRICT_AUTHORITY" ? "#aa6a13" : "#087b68",
                }}
              >
                {userRole.replace("_", " ")}
              </span>
              {verificationStatus === "PENDING" && <span style={{ color: "#aa6a13" }}> (Pending Verification)</span>}
            </span>
          </div>

          <LanguageSelector />

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: "#fff0ed",
                color: "#a64437",
                border: "1px solid #f8cdcd",
                padding: "8px 14px",
                borderRadius: "6px",
                font: "600 12px 'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main style={{ flex: 1, padding: "30px 28px", maxWidth: "1340px", width: "100%", margin: "0 auto" }}>
        {verificationStatus === "PENDING" && userRole !== "CITIZEN" && (
          <div
            style={{
              background: "#fff9eb",
              border: "1px solid #f2d28d",
              borderRadius: "10px",
              padding: "14px 18px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#8a6d13",
              fontSize: "13px",
            }}
          >
            <div>
              <strong style={{ font: "700 14px Outfit", color: "#6e5509", display: "block" }}>
                ⚠️ Pending Role Verification: {userRole.replace("_", " ")}
              </strong>
              Your requested role level ({userRole.replace("_", " ")}) is currently awaiting verification by a System Administrator. Operational actions are restricted until verified.
            </div>
            <span style={{ font: "700 11px 'DM Sans'", background: "#f5dfaa", padding: "4px 8px", borderRadius: "6px" }}>
              STATUS: PENDING
            </span>
          </div>
        )}

        {children}
      </main>

      <AIAssistantWidget />
      <OfflineIndicator />
    </div>
  );
}
