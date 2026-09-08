import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export async function GET() {
  try {
    const persons = await prisma.missingPerson.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        district: {
          select: { name: true },
        },
      },
    });

    // Strip lastSeenLatitude and lastSeenLongitude from response (return null for these — keep locationName)
    const sanitizedPersons = persons.map((person) => ({
      ...person,
      lastSeenLatitude: null,
      lastSeenLongitude: null,
    }));

    return NextResponse.json({ success: true, data: sanitizedPersons });
  } catch (error) {
    console.error("GET /api/v1/missing-persons error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch missing persons" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let reportedById: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          reportedById = user.id;
        }
      }
    } catch {
      // Optional authentication: allow anonymous submissions
    }

    const body = await request.json();
    const {
      name,
      contactName,
      contactPhone,
      description,
      lastSeenAt,
      locationName,
      photoUrl,
      districtId,
    } = body;

    // Validate required fields
    if (!name || !contactName || !contactPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "name, contactName, and contactPhone are required",
        },
        { status: 400 }
      );
    }

    // Resolve districtId if provided
    let resolvedDistrictId: string | null = null;
    if (districtId) {
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
    }

    const parsedLastSeenAt =
      lastSeenAt && !isNaN(new Date(lastSeenAt).getTime())
        ? new Date(lastSeenAt)
        : null;

    // Do NOT accept lastSeenLatitude/Longitude from client body for security (GPS submitted separately)
    const person = await prisma.missingPerson.create({
      data: {
        reportedById,
        name: String(name).trim(),
        contactName: String(contactName).trim(),
        contactPhone: String(contactPhone).trim(),
        description: description ? String(description) : null,
        lastSeenAt: parsedLastSeenAt,
        locationName: locationName ? String(locationName) : null,
        photoUrl: photoUrl ? String(photoUrl) : null,
        districtId: resolvedDistrictId,
        status: "MISSING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: person.id,
          name: person.name,
          status: person.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/v1/missing-persons error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create missing person report" },
      { status: 500 }
    );
  }
}
