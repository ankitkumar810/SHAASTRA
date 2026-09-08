import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export async function GET() {
  try {
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

    const reports = await prisma.disasterReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        district: { select: { name: true } },
        reporter: { select: { fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error("GET /api/v1/reports error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch disaster reports" },
      { status: 500 }
    );
  }
}

const VALID_HAZARD_TYPES = [
  "Flood",
  "Landslide",
  "Fire",
  "Building Damage",
  "Road Blockage",
  "Medical Emergency",
  "Other",
] as const;

export async function POST(request: NextRequest) {
  try {
    let reporterId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          reporterId = user.id;
        }
      }
    } catch {
      // Optional authentication: allow anonymous submissions
    }

    const body = await request.json();
    const {
      hazardType,
      description,
      locationName,
      districtId,
      latitude,
      longitude,
      photoUrl,
      reporterName,
      reporterContact,
    } = body;

    // Validate required fields
    if (!hazardType || !description || !locationName || !districtId) {
      return NextResponse.json(
        {
          success: false,
          error: "hazardType, description, locationName, and districtId are required",
        },
        { status: 400 }
      );
    }

    // Validate hazardType against allowed values
    if (!VALID_HAZARD_TYPES.includes(hazardType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid hazardType. Must be one of: ${VALID_HAZARD_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Resolve districtId by id or name
    let resolvedDistrictId = districtId;
    const district = await prisma.district.findFirst({
      where: {
        OR: [
          { id: districtId },
          { name: { equals: districtId, mode: "insensitive" } },
        ],
      },
    });

    if (!district) {
      return NextResponse.json(
        { success: false, error: "Specified district not found" },
        { status: 400 }
      );
    }
    resolvedDistrictId = district.id;

    const report = await prisma.disasterReport.create({
      data: {
        reporterId,
        reporterName: reporterName ? String(reporterName) : null,
        reporterContact: reporterContact ? String(reporterContact) : null,
        hazardType,
        description: String(description),
        districtId: resolvedDistrictId,
        latitude:
          latitude !== undefined && latitude !== null && !isNaN(Number(latitude))
            ? Number(latitude)
            : null,
        longitude:
          longitude !== undefined && longitude !== null && !isNaN(Number(longitude))
            ? Number(longitude)
            : null,
        locationName: String(locationName),
        photoUrl: photoUrl ? String(photoUrl) : null,
        status: "RECEIVED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: report.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/v1/reports error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit disaster report" },
      { status: 500 }
    );
  }
}
