import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";
import { logAuditEvent } from "@/lib/services/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (profile.role === "SHELTER_ADMIN" && profile.shelterId !== id) {
      return NextResponse.json({ success: false, error: "Forbidden: Cannot update inventory for unassigned shelter" }, { status: 403 });
    }

    if (profile.role === "CITIZEN") {
      return NextResponse.json({ success: false, error: "Forbidden: Citizens cannot update shelter inventory" }, { status: 403 });
    }

    const body = await request.json();
    const { foodDays, medicineStatus, waterDays, notes } = body;

    if (foodDays === undefined || !medicineStatus) {
      return NextResponse.json({ success: false, error: "Missing foodDays or medicineStatus" }, { status: 400 });
    }

    const inventory = await prisma.shelterInventory.create({
      data: {
        shelterId: id,
        foodDays: Number(foodDays),
        medicineStatus: String(medicineStatus),
        waterDays: waterDays !== undefined ? Number(waterDays) : null,
        notes: notes || null,
      },
    });

    const foodStockString = `Food ${foodDays} days`;
    await prisma.shelter.update({
      where: { id },
      data: {
        foodStockStatus: foodStockString,
        medicineStockStatus: String(medicineStatus),
        lastUpdated: new Date(),
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_SHELTER_INVENTORY",
      entity: "ShelterInventory",
      entityId: inventory.id,
      details: { shelterId: id, foodDays, medicineStatus },
    });

    return NextResponse.json({ success: true, data: inventory }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/shelters/[id]/inventory error:", error);
    return NextResponse.json({ success: false, error: "Failed to record inventory update" }, { status: 500 });
  }
}
