import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

interface ConsentRequestBody {
  latitude: number;
  longitude: number;
  accuracy?: number;
  duration: "once" | "1h" | "indefinite";
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as ConsentRequestBody;
    const { latitude, longitude, accuracy, duration } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { success: false, error: "Latitude and longitude are required numbers" },
        { status: 400 }
      );
    }

    if (!duration || !["once", "1h", "indefinite"].includes(duration)) {
      return NextResponse.json(
        { success: false, error: "Duration must be 'once', '1h', or 'indefinite'" },
        { status: 400 }
      );
    }

    const now = new Date();
    let expiresAt: Date | null = null;
    if (duration === "once") {
      expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    } else if (duration === "1h") {
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (duration === "indefinite") {
      expiresAt = null;
    }

    // Upsert LocationConsent: if user already has an active GRANTED consent, update it; else create new
    const existingConsent = await prisma.locationConsent.findFirst({
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

    let consent;
    if (existingConsent) {
      consent = await prisma.locationConsent.update({
        where: { id: existingConsent.id },
        data: {
          latitude,
          longitude,
          accuracy: typeof accuracy === "number" ? accuracy : null,
          expiresAt,
          startedAt: now,
          consentStatus: "GRANTED",
          revokedAt: null,
        },
      });
    } else {
      consent = await prisma.locationConsent.create({
        data: {
          userId: user.id,
          consentStatus: "GRANTED",
          latitude,
          longitude,
          accuracy: typeof accuracy === "number" ? accuracy : null,
          expiresAt,
          startedAt: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      consentId: consent.id,
      expiresAt: consent.expiresAt,
    });
  } catch (error) {
    console.error("POST /api/v1/location/consent error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record location consent",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  void request;
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

    const now = new Date();
    await prisma.locationConsent.updateMany({
      where: {
        userId: user.id,
        consentStatus: "GRANTED",
      },
      data: {
        consentStatus: "REVOKED",
        revokedAt: now,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v1/location/consent error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to revoke location consent",
      },
      { status: 500 }
    );
  }
}
