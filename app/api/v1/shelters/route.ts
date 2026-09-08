import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";
import { logAuditEvent } from "@/lib/services/audit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const district = searchParams.get("district") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { locality: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    if (district) {
      where.district = { name: { equals: district, mode: "insensitive" } };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const shelters = await prisma.shelter.findMany({
      where,
      include: {
        district: { select: { id: true, name: true, state: true } },
        zone: { select: { id: true, name: true } },
      },
      orderBy: { availableBeds: "desc" },
    });

    const safeShelters = shelters.map((s) => ({
      id: s.id,
      name: s.name,
      locality: s.locality,
      address: s.address,
      district: s.district.name,
      zone: s.zone?.name || null,
      latitude: s.latitude,
      longitude: s.longitude,
      totalBeds: s.totalBeds,
      occupiedBeds: s.occupiedBeds,
      availableBeds: s.availableBeds,
      foodStockStatus: s.foodStockStatus,
      medicineStockStatus: s.medicineStockStatus,
      waterStockStatus: s.waterStockStatus,
      status: s.status,
      lastUpdated: s.lastUpdated,
    }));

    return NextResponse.json({ success: true, data: safeShelters });
  } catch (error) {
    console.error("GET /api/v1/shelters error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch shelters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (
      !profile ||
      profile.verificationStatus !== "VERIFIED" ||
      (profile.role !== "DISTRICT_AUTHORITY" && profile.role !== "SYSTEM_ADMIN")
    ) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires verified District Authority or System Admin" }, { status: 403 });
    }

    const body = await request.json();
    const { name, locality, address, districtId, zoneId, totalBeds, foodStockStatus, medicineStockStatus, latitude, longitude } = body;

    if (!name || !locality || !address || !districtId || totalBeds === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const shelter = await prisma.shelter.create({
      data: {
        name,
        locality,
        address,
        districtId,
        zoneId: zoneId || null,
        totalBeds: Number(totalBeds),
        occupiedBeds: 0,
        availableBeds: Number(totalBeds),
        foodStockStatus: foodStockStatus || "Food 3 days",
        medicineStockStatus: medicineStockStatus || "Medicine ready",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        status: "OPEN",
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CREATE_SHELTER",
      entity: "Shelter",
      entityId: shelter.id,
      details: { name: shelter.name, districtId: shelter.districtId },
    });

    return NextResponse.json({ success: true, data: shelter }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/shelters error:", error);
    return NextResponse.json({ success: false, error: "Failed to create shelter" }, { status: 500 });
  }
}
