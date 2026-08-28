import { prisma } from "@/lib/prisma";
import type { Role, VerificationStatus } from "@prisma/client";

export interface CreateProfileInput {
  id: string;
  email?: string | null;
  fullName: string;
  phone?: string | null;
  requestedRole?: Role | string;
  districtId?: string | null;
  shelterId?: string | null;
}

/**
 * SERVER-SIDE ROLE SECURITY SANITIZATION
 * Public signups are strictly forced to CITIZEN role with VERIFIED status.
 * SYSTEM_ADMIN and DISTRICT_AUTHORITY roles CANNOT be self-assigned under any circumstances.
 */
export function sanitizeRole(requestedRole?: string): { role: Role; verificationStatus: VerificationStatus } {
  // Always enforce CITIZEN for public signups. Privileged roles cannot be self-requested.
  return {
    role: "CITIZEN" as Role,
    verificationStatus: "VERIFIED" as VerificationStatus,
  };
}

export async function getUserProfile(userId: string) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        district: true,
        shelter: true,
      },
    });

    if (profile) {
      return profile;
    }

    // Lazy sync from Supabase Auth user metadata if Profile does not exist in DB yet
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.id === userId) {
      const synced = await syncUserProfile({
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "SHAASTRA User",
        requestedRole: "CITIZEN", // Strictly enforce CITIZEN for public registrations
        districtId: user.user_metadata?.district_id,
      });

      if (synced) {
        return await prisma.profile.findUnique({
          where: { id: userId },
          include: { district: true, shelter: true },
        });
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function syncUserProfile(input: CreateProfileInput) {
  try {
    const { role, verificationStatus } = sanitizeRole(input.requestedRole);

    const existing = await prisma.profile.findUnique({
      where: { id: input.id },
    });

    if (existing) {
      return existing;
    }

    return await prisma.profile.create({
      data: {
        id: input.id,
        email: input.email || undefined,
        fullName: input.fullName,
        phone: input.phone || undefined,
        role: role,
        verificationStatus: verificationStatus,
        districtId: input.districtId || undefined,
        shelterId: input.shelterId || undefined,
      },
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    return null;
  }
}

export function getDashboardPathForRole(role?: string): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "/dashboard/admin";
    case "DISTRICT_AUTHORITY":
      return "/dashboard/authority";
    case "SHELTER_ADMIN":
      return "/dashboard/shelter";
    case "CITIZEN":
    default:
      return "/dashboard/citizen";
  }
}
