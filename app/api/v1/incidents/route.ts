import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  void request;
  void createClient;
  void getUserProfile;
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        district: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    console.error("GET /api/v1/incidents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch incidents",
      },
      { status: 500 }
    );
  }
}
