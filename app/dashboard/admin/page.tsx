import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SystemAdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);

  // Strict Server-Side Guard: Only verified System Admins
  if (!profile || profile.verificationStatus !== "VERIFIED" || profile.role !== "SYSTEM_ADMIN") {
    redirect("/dashboard/citizen");
  }

  let pendingProfiles: Array<{ id: string; fullName: string; role: string; email: string | null }> = [];
  let auditLogs: Array<{ id: string; action: string; entity: string; details: string | null; createdAt: Date }> = [];

  try {
    pendingProfiles = await prisma.profile.findMany({
      where: { verificationStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    auditLogs = await prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("Error fetching admin data:", err);
  }

  async function approveUserAction(formData: FormData) {
    "use server";
    const profileId = String(formData.get("profileId"));
    const actionType = String(formData.get("actionType"));

    if (actionType === "APPROVE") {
      await prisma.profile.update({
        where: { id: profileId },
        data: { verificationStatus: "VERIFIED" },
      });
    } else {
      await prisma.profile.update({
        where: { id: profileId },
        data: { role: "CITIZEN", verificationStatus: "VERIFIED" },
      });
    }

    revalidatePath("/dashboard/admin");
  }

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ color: "#b64b3d", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px" }}>
          SYSTEM ADMINISTRATION
        </p>
        <h1 style={{ font: "700 36px Outfit", margin: 0, color: "#17323b" }}>
          SHAASTRA System Management
        </h1>
        <p style={{ color: "#71858a", fontSize: "15px", margin: "8px 0 0" }}>
          Role verifications, security policy administration, and system audit inspection.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ font: "700 20px Outfit", margin: "0 0 16px", color: "#17323b" }}>
            Role Verification Queue ({pendingProfiles.length})
          </h2>

          {pendingProfiles.length > 0 ? (
            <div style={{ display: "grid", gap: "14px" }}>
              {pendingProfiles.map((p) => (
                <div key={p.id} style={{ border: "1px solid #dce7e6", borderRadius: "8px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ font: "600 15px Outfit", margin: "0 0 4px" }}>{p.fullName}</h4>
                    <p style={{ fontSize: "12px", color: "#71858a", margin: 0 }}>
                      Requested: <strong style={{ color: "#aa6a13" }}>{p.role}</strong> ({p.email || "No email"})
                    </p>
                  </div>

                  <form action={approveUserAction} style={{ display: "flex", gap: "8px" }}>
                    <input type="hidden" name="profileId" value={p.id} />
                    <button
                      type="submit"
                      name="actionType"
                      value="APPROVE"
                      style={{ background: "#e2f6ed", color: "#087b68", border: 0, padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="actionType"
                      value="REJECT"
                      style={{ background: "#fee8e4", color: "#b64b3d", border: 0, padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Reset to Citizen
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#71858a", fontSize: "14px" }}>No pending role elevation requests in the queue.</p>
          )}
        </div>

        <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ font: "700 20px Outfit", margin: "0 0 16px", color: "#17323b" }}>System Audit Logs</h2>

          {auditLogs.length > 0 ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ fontSize: "12px", borderBottom: "1px solid #eef4f3", paddingBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong style={{ color: "#087d7a" }}>{log.action}</strong> — {log.entity}
                    <div style={{ color: "#71858a", fontSize: "11px", marginTop: "2px" }}>{log.details || "System event"}</div>
                  </div>
                  <time style={{ color: "#71858a", fontSize: "11px" }}>{new Date(log.createdAt).toLocaleTimeString()}</time>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#71858a" }}>
              <p>✓ System audit logging active.</p>
              <p>No recent security incidents logged.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
