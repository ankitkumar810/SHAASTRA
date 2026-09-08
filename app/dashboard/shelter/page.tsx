import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ShelterAdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { shelter: true },
  });

  // Strict Server-Side Guard: Only verified Shelter Admins, District Authorities, or System Admins
  if (
    !profile ||
    profile.verificationStatus !== "VERIFIED" ||
    (profile.role !== "SHELTER_ADMIN" && profile.role !== "DISTRICT_AUTHORITY" && profile.role !== "SYSTEM_ADMIN")
  ) {
    redirect("/dashboard/citizen");
  }

  // Ownership Guard: Fetch assigned shelter
  const assignedShelter = profile.shelterId
    ? await prisma.shelter.findUnique({
        where: { id: profile.shelterId },
        include: {
          inventories: { take: 5, orderBy: { recordedAt: "desc" } },
          updates: { take: 5, orderBy: { createdAt: "desc" } },
          alerts: { take: 5, orderBy: { createdAt: "desc" } },
        },
      })
    : (profile.role === "SYSTEM_ADMIN" || profile.role === "DISTRICT_AUTHORITY")
    ? await prisma.shelter.findFirst({
        include: {
          inventories: { take: 5, orderBy: { recordedAt: "desc" } },
          updates: { take: 5, orderBy: { createdAt: "desc" } },
          alerts: { take: 5, orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  async function updateCapacityAction(formData: FormData) {
    "use server";
    const shelterId = String(formData.get("shelterId"));
    const occupiedBeds = parseInt(String(formData.get("occupiedBeds")), 10) || 0;
    const totalBeds = parseInt(String(formData.get("totalBeds")), 10) || 100;
    const status = String(formData.get("status")) as "OPEN" | "LIMITED" | "FULL" | "CLOSED";
    const notes = String(formData.get("notes") || "");

    const availableBeds = Math.max(0, totalBeds - occupiedBeds);

    const current = await prisma.shelter.findUnique({ where: { id: shelterId } });
    if (!current) return;

    await prisma.shelter.update({
      where: { id: shelterId },
      data: {
        occupiedBeds,
        totalBeds,
        availableBeds,
        status,
        lastUpdated: new Date(),
      },
    });

    await prisma.shelterUpdate.create({
      data: {
        shelterId,
        updatedById: user!.id,
        occupiedBeds,
        availableBeds,
        foodStockStatus: current.foodStockStatus,
        medicineStockStatus: current.medicineStockStatus,
        status,
        notes: notes || "Bed capacity update",
      },
    });

    revalidatePath("/dashboard/shelter");
    revalidatePath("/dashboard/citizen/shelters");
    revalidatePath(`/dashboard/citizen/shelters/${shelterId}`);
  }

  async function updateInventoryAction(formData: FormData) {
    "use server";
    const shelterId = String(formData.get("shelterId"));
    const foodDays = parseFloat(String(formData.get("foodDays"))) || 1;
    const medicineStatus = String(formData.get("medicineStatus"));
    const waterDays = parseFloat(String(formData.get("waterDays"))) || 1;
    const notes = String(formData.get("notes") || "");

    const foodString = `Food ${foodDays} days`;

    await prisma.shelterInventory.create({
      data: {
        shelterId,
        foodDays,
        medicineStatus,
        waterDays,
        notes: notes || null,
      },
    });

    await prisma.shelter.update({
      where: { id: shelterId },
      data: {
        foodStockStatus: foodString,
        medicineStockStatus: medicineStatus,
        lastUpdated: new Date(),
      },
    });

    revalidatePath("/dashboard/shelter");
    revalidatePath("/dashboard/citizen/shelters");
    revalidatePath(`/dashboard/citizen/shelters/${shelterId}`);
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <p style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px", textTransform: "uppercase" }}>
          SHELTER MANAGEMENT WORKSPACE
        </p>
        <h1 style={{ font: "700 34px Outfit", margin: 0, color: "#17323b" }}>
          {assignedShelter ? assignedShelter.name : "Unassigned Shelter Manager"}
        </h1>
        <p style={{ color: "#71858a", fontSize: "14px", margin: "6px 0 0" }}>
          Authorized inventory tracking, bed occupancy updates, and timestamped operational logs.
        </p>
      </div>

      {assignedShelter ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
          <div style={{ display: "grid", gap: "24px" }}>
            {/* Bed Capacity Form */}
            <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ font: "700 20px Outfit", margin: "0 0 18px", color: "#17323b" }}>
                Bed Capacity & Operating Status
              </h2>

              <form action={updateCapacityAction} style={{ display: "grid", gap: "16px" }}>
                <input type="hidden" name="shelterId" value={assignedShelter.id} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Total Bed Capacity
                    <input
                      type="number"
                      name="totalBeds"
                      defaultValue={assignedShelter.totalBeds}
                      required
                      style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Currently Occupied Beds
                    <input
                      type="number"
                      name="occupiedBeds"
                      defaultValue={assignedShelter.occupiedBeds}
                      required
                      style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Operating Status
                  <select
                    name="status"
                    defaultValue={assignedShelter.status}
                    style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                  >
                    <option value="OPEN">Open (Accepting evacuees)</option>
                    <option value="LIMITED">Limited (Near capacity)</option>
                    <option value="FULL">Full (No available beds)</option>
                    <option value="CLOSED">Closed (Temporarily inactive)</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Update Notes (Optional)
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Received 20 new evacuees from Aluva North"
                    style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                  />
                </label>

                <button
                  type="submit"
                  style={{
                    background: "#087d7a",
                    color: "white",
                    border: 0,
                    borderRadius: "8px",
                    padding: "12px",
                    font: "600 14px 'DM Sans', sans-serif",
                    cursor: "pointer",
                    marginTop: "6px",
                  }}
                >
                  Broadcast Capacity Update →
                </button>
              </form>
            </div>

            {/* Inventory Form */}
            <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ font: "700 20px Outfit", margin: "0 0 18px", color: "#17323b" }}>
                Shelter Resource Inventory
              </h2>

              <form action={updateInventoryAction} style={{ display: "grid", gap: "16px" }}>
                <input type="hidden" name="shelterId" value={assignedShelter.id} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Food Rations Remaining (Days)
                    <input
                      type="number"
                      step="0.5"
                      name="foodDays"
                      defaultValue={3}
                      required
                      style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Clean Water Supply (Days)
                    <input
                      type="number"
                      step="0.5"
                      name="waterDays"
                      defaultValue={4}
                      style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  Medical Supplies Condition
                  <select
                    name="medicineStatus"
                    defaultValue={assignedShelter.medicineStockStatus}
                    style={{ padding: "10px", borderRadius: "6px", border: "1px solid #dce7e6", fontSize: "14px" }}
                  >
                    <option value="Medicine ready">Medicine ready (Adequate first aid & essential meds)</option>
                    <option value="Medicine low">Medicine low (Requires replenishment within 24h)</option>
                    <option value="Medicine critical">Medicine critical (Urgent medical supply request)</option>
                  </select>
                </label>

                <button
                  type="submit"
                  style={{
                    background: "#075c63",
                    color: "white",
                    border: 0,
                    borderRadius: "8px",
                    padding: "12px",
                    font: "600 14px 'DM Sans', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Record Inventory Log →
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar Overview & Log History */}
          <div style={{ display: "grid", gap: "20px", alignContent: "start" }}>
            <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#71858a", letterSpacing: "1px" }}>LIVE METRICS</span>
              <h3 style={{ font: "700 22px Outfit", margin: "8px 0 4px", color: "#17323b" }}>{assignedShelter.availableBeds} Beds Free</h3>
              <p style={{ fontSize: "12px", color: "#71858a", margin: 0 }}>{assignedShelter.address}</p>

              <div style={{ marginTop: "16px", display: "grid", gap: "10px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Food Status:</span>
                  <strong>{assignedShelter.foodStockStatus}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Medicine Status:</span>
                  <strong>{assignedShelter.medicineStockStatus}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Last Updated:</span>
                  <span style={{ color: "#71858a" }}>{new Date(assignedShelter.lastUpdated).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "20px" }}>
              <h4 style={{ font: "700 16px Outfit", margin: "0 0 14px", color: "#17323b" }}>Recent Inventory Updates</h4>

              {assignedShelter.inventories.length > 0 ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  {assignedShelter.inventories.map((inv) => (
                    <div key={inv.id} style={{ fontSize: "12px", borderBottom: "1px solid #eef4f3", paddingBottom: "8px" }}>
                      <div><strong>Food:</strong> {inv.foodDays} days · <strong>Med:</strong> {inv.medicineStatus}</div>
                      <time style={{ color: "#91a2a4", fontSize: "11px" }}>{new Date(inv.recordedAt).toLocaleTimeString()}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#71858a", fontSize: "12px", margin: 0 }}>No recent inventory logs recorded.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", border: "1px solid #dce7e6" }}>
          <p style={{ color: "#71858a", margin: 0 }}>
            No shelter currently assigned to your profile. Please contact your District Administrator to link your shelter ID.
          </p>
        </div>
      )}
    </div>
  );
}
