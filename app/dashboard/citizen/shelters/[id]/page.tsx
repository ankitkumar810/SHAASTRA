import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CitizenShelterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let shelter = null;
  try {
    shelter = await prisma.shelter.findUnique({
      where: { id },
      include: {
        district: { select: { name: true, state: true } },
        zone: { select: { name: true } },
        updates: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            occupiedBeds: true,
            availableBeds: true,
            foodStockStatus: true,
            medicineStockStatus: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching shelter details:", error);
  }

  if (!shelter) {
    notFound();
  }

  const occupancy = Math.round(((shelter.totalBeds - shelter.availableBeds) / shelter.totalBeds) * 100);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/dashboard/citizen/shelters" style={{ color: "#087d7a", font: "600 13px 'DM Sans'", textDecoration: "none" }}>
          ← Back to Shelter Discovery
        </Link>
      </div>

      <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "28px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#087d7a", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              VERIFIED RELIEF SHELTER
            </span>
            <h1 style={{ font: "700 32px Outfit", margin: "6px 0 4px", color: "#17323b" }}>{shelter.name}</h1>
            <p style={{ color: "#71858a", fontSize: "14px", margin: 0 }}>
              ⌖ {shelter.locality} · {shelter.district.name} {shelter.zone ? `(${shelter.zone.name} Zone)` : ""}
            </p>
          </div>

          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: "12px",
              color: shelter.status === "OPEN" ? "#087b68" : shelter.status === "LIMITED" ? "#aa6a13" : "#b64b3d",
              background: shelter.status === "OPEN" ? "#e2f6ed" : shelter.status === "LIMITED" ? "#fff1d9" : "#fee8e4",
            }}
          >
            {shelter.status}
          </span>
        </div>

        <div style={{ background: "#f7fbfa", border: "1px solid #e6eeee", borderRadius: "10px", padding: "20px", margin: "20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ font: "700 18px Outfit", color: "#17323b" }}>
              <strong style={{ color: "#087b68", fontSize: "24px" }}>{shelter.availableBeds}</strong> Available Beds
            </span>
            <span style={{ fontSize: "13px", color: "#71858a" }}>
              {shelter.occupiedBeds} of {shelter.totalBeds} occupied ({occupancy}%)
            </span>
          </div>

          <div style={{ height: "8px", background: "#e4eeee", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${occupancy}%`, background: "#087d7a", borderRadius: "4px" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "24px 0" }}>
          <div style={{ border: "1px solid #dce7e6", borderRadius: "10px", padding: "16px" }}>
            <span style={{ fontSize: "20px" }}>▣</span>
            <h4 style={{ font: "600 14px Outfit", margin: "6px 0 2px" }}>Food Supply</h4>
            <p style={{ fontSize: "13px", color: "#087b68", fontWeight: 600, margin: 0 }}>{shelter.foodStockStatus}</p>
          </div>

          <div style={{ border: "1px solid #dce7e6", borderRadius: "10px", padding: "16px" }}>
            <span style={{ fontSize: "20px" }}>✚</span>
            <h4 style={{ font: "600 14px Outfit", margin: "6px 0 2px" }}>Medical Care</h4>
            <p style={{ fontSize: "13px", color: "#087b68", fontWeight: 600, margin: 0 }}>{shelter.medicineStockStatus}</p>
          </div>
        </div>

        <div style={{ fontSize: "13px", color: "#577276", borderTop: "1px solid #eef4f3", paddingTop: "16px", display: "flex", justifyContent: "space-between" }}>
          <span><strong>Address:</strong> {shelter.address}</span>
          <span style={{ color: "#91a2a4" }}>Last sync: {new Date(shelter.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "24px" }}>
        <h3 style={{ font: "700 18px Outfit", margin: "0 0 16px", color: "#17323b" }}>Recent Status Updates</h3>

        {shelter.updates.length > 0 ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {shelter.updates.map((upd) => (
              <div key={upd.id} style={{ borderBottom: "1px solid #eef4f3", paddingBottom: "10px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <div>
                  <strong>{upd.availableBeds} beds available</strong> · {upd.foodStockStatus} · {upd.medicineStockStatus}
                </div>
                <time style={{ color: "#91a2a4", fontSize: "12px" }}>{new Date(upd.createdAt).toLocaleTimeString()}</time>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#71858a", fontSize: "13px", margin: 0 }}>No recent update logs available.</p>
        )}
      </div>
    </div>
  );
}
