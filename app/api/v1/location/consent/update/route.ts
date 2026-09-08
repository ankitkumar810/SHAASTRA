import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

interface UpdateRequestBody {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure user profile exists
    await getUserProfile(user.id);

    const body = (await request.json()) as UpdateRequestBody;
    const { latitude, longitude, accuracy } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { success: false, error: "Latitude and longitude are required numbers" },
        { status: 400 }
      );
    }

    const now = new Date();
    const activeConsent = await prisma.locationConsent.findFirst({
      where: {
        userId: user.id,
        consentStatus: "GRANTED",
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!activeConsent) {
      return NextResponse.json(
        { success: false, error: "Active location consent not found" },
        { status: 404 }
      );
    }

    await prisma.locationConsent.update({
      where: { id: activeConsent.id },
      data: {
        latitude,
        longitude,
        ...(accuracy !== undefined
          ? { accuracy: typeof accuracy === "number" ? accuracy : null }
          : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/v1/location/consent/update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update location",
      },
      { status: 500 }
    );
  }
}
