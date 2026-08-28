import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShelterDiscoveryClient } from "./ShelterDiscoveryClient";

export const dynamic = "force-dynamic";

export default async function CitizenShelterDiscoveryPage() {
  let shelters: Array<{
    id: string;
    name: string;
    locality: string;
    address: string;
    districtId: string;
    zoneId: string | null;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    foodStockStatus: string;
    medicineStockStatus: string;
    waterStockStatus: string | null;
    status: string;
    latitude: number | null;
    longitude: number | null;
    lastUpdated: Date;
    districtName: string;
    zoneName: string | null;
  }> = [];

  let districts: Array<{ id: string; name: string }> = [];

  try {
    const rawShelters = await prisma.shelter.findMany({
      include: {
        district: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
      orderBy: { availableBeds: "desc" },
    });

    shelters = rawShelters.map((s) => ({
      id: s.id,
      name: s.name,
      locality: s.locality,
      address: s.address,
      districtId: s.districtId,
      zoneId: s.zoneId,
      totalBeds: s.totalBeds,
      occupiedBeds: s.occupiedBeds,
      availableBeds: s.availableBeds,
      foodStockStatus: s.foodStockStatus,
      medicineStockStatus: s.medicineStockStatus,
      waterStockStatus: s.waterStockStatus,
      status: s.status,
      latitude: s.latitude,
      longitude: s.longitude,
      lastUpdated: s.lastUpdated,
      districtName: s.district.name,
      zoneName: s.zone?.name || null,
    }));

    districts = await prisma.district.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error loading shelters for discovery:", error);
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <p style={{ color: "#087d7a", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px", textTransform: "uppercase" }}>
          SHELTER DISCOVERY
        </p>
        <h1 style={{ font: "700 36px Outfit", margin: 0, color: "#17323b" }}>
          Verified Relief Shelters
        </h1>
        <p style={{ color: "#71858a", fontSize: "15px", margin: "6px 0 0" }}>
          Find safe shelter with live bed availability and essential resource tracking across districts.
        </p>
      </div>

      <ShelterDiscoveryClient initialShelters={shelters} districts={districts} />
    </div>
  );
}
