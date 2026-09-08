import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";
import type { MissingPersonStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const person = await prisma.missingPerson.findUnique({
      where: { id },
      include: {
        district: {
          select: { name: true },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: "Missing person record not found" },
        { status: 404 }
      );
    }

    let isAuthorizedAuthority = false;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await getUserProfile(user.id);
        if (
          profile &&
          profile.verificationStatus === "VERIFIED" &&
          (profile.role === "DISTRICT_AUTHORITY" || profile.role === "SYSTEM_ADMIN")
        ) {
          isAuthorizedAuthority = true;
        }
      }
    } catch {
      // Unauthenticated or auth check error
    }

    // If authority, return full record including lastSeenLatitude, lastSeenLongitude; otherwise null them out
    const responsePerson = isAuthorizedAuthority
      ? person
      : {
          ...person,
          lastSeenLatitude: null,
          lastSeenLongitude: null,
        };

    return NextResponse.json({ success: true, data: responsePerson });
  } catch (error) {
    console.error("GET /api/v1/missing-persons/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch missing person record" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(user.id);
    if (
      !profile ||
      profile.verificationStatus !== "VERIFIED" ||
      (profile.role !== "DISTRICT_AUTHORITY" && profile.role !== "SYSTEM_ADMIN")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Requires verified District Authority or System Admin",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses: MissingPersonStatus[] = [
      "MISSING",
      "LOCATED",
      "SAFE",
      "REUNITED",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.missingPerson.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Missing person record not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.missingPerson.update({
      where: { id },
      data: {
        status: status as MissingPersonStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("PATCH /api/v1/missing-persons/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update missing person status" },
      { status: 500 }
    );
  }
}
