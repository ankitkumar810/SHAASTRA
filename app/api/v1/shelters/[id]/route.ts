import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";
import { logAuditEvent } from "@/lib/services/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const shelter = await prisma.shelter.findUnique({
      where: { id },
      include: {
        district: { select: { id: true, name: true, state: true } },
        zone: { select: { id: true, name: true } },
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
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shelter) {
      return NextResponse.json({ success: false, error: "Shelter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: shelter });
  } catch (error) {
    console.error("GET /api/v1/shelters/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch shelter details" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "User profile not found" }, { status: 403 });
    }

    // Role Ownership Guard: Shelter Admin can ONLY modify their assigned shelter
    if (profile.role === "SHELTER_ADMIN" && profile.shelterId !== id) {
      return NextResponse.json({ success: false, error: "Forbidden: Cannot modify unassigned shelter" }, { status: 403 });
    }

    if (profile.role === "CITIZEN") {
      return NextResponse.json({ success: false, error: "Forbidden: Citizen accounts cannot update shelters" }, { status: 403 });
    }

    const body = await request.json();
    const { occupiedBeds, totalBeds, foodStockStatus, medicineStockStatus, waterStockStatus, status, notes } = body;

    const currentShelter = await prisma.shelter.findUnique({ where: { id } });
    if (!currentShelter) {
      return NextResponse.json({ success: false, error: "Shelter not found" }, { status: 404 });
    }

    const newTotal = totalBeds !== undefined ? Number(totalBeds) : currentShelter.totalBeds;
    const newOccupied = occupiedBeds !== undefined ? Number(occupiedBeds) : currentShelter.occupiedBeds;
    const newAvailable = Math.max(0, newTotal - newOccupied);
    const newFood = foodStockStatus || currentShelter.foodStockStatus;
    const newMedicine = medicineStockStatus || currentShelter.medicineStockStatus;
    const newStatus = status || currentShelter.status;

    const updatedShelter = await prisma.shelter.update({
      where: { id },
      data: {
        totalBeds: newTotal,
        occupiedBeds: newOccupied,
        availableBeds: newAvailable,
        foodStockStatus: newFood,
        medicineStockStatus: newMedicine,
        waterStockStatus: waterStockStatus !== undefined ? waterStockStatus : currentShelter.waterStockStatus,
        status: newStatus,
        lastUpdated: new Date(),
      },
    });

    await prisma.shelterUpdate.create({
      data: {
        shelterId: id,
        updatedById: user.id,
        occupiedBeds: newOccupied,
        availableBeds: newAvailable,
        foodStockStatus: newFood,
        medicineStockStatus: newMedicine,
        status: newStatus,
        notes: notes || null,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_SHELTER_STATUS",
      entity: "Shelter",
      entityId: id,
      details: { occupiedBeds: newOccupied, availableBeds: newAvailable, status: newStatus },
    });

    return NextResponse.json({ success: true, data: updatedShelter });
  } catch (error) {
    console.error("PATCH /api/v1/shelters/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update shelter" }, { status: 500 });
  }
}
