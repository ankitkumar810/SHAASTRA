import { prisma } from "@/lib/prisma";
import type { Role, VerificationStatus } from "@prisma/client";

export interface CreateProfileInput {
  id: string;
  email?: string | null;
  fullName: string;
  phone?: string | null;
  requestedRole?: Role | string;
  districtId?: string | null;
  districtName?: string | null;
  shelterId?: string | null;
}

/**
 * SERVER-SIDE ROLE SECURITY SANITIZATION
 * Citizens receive VERIFIED status immediately upon registration.
 * Privileged roles (SHELTER_ADMIN, DISTRICT_AUTHORITY, SYSTEM_ADMIN) are registered with
 * PENDING verification status, requiring district/administrator verification before activation.
 */
export function sanitizeRole(requestedRole?: string): { role: Role; verificationStatus: VerificationStatus } {
  switch (requestedRole) {
    case "SHELTER_ADMIN":
      return {
        role: "SHELTER_ADMIN" as Role,
        verificationStatus: "PENDING" as VerificationStatus,
      };
    case "DISTRICT_AUTHORITY":
      return {
        role: "DISTRICT_AUTHORITY" as Role,
        verificationStatus: "PENDING" as VerificationStatus,
      };
    case "SYSTEM_ADMIN":
      return {
        role: "SYSTEM_ADMIN" as Role,
        verificationStatus: "PENDING" as VerificationStatus,
      };
    case "CITIZEN":
    default:
      return {
        role: "CITIZEN" as Role,
        verificationStatus: "VERIFIED" as VerificationStatus,
      };
  }
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
        requestedRole: user.user_metadata?.requested_role || "CITIZEN",
        districtId: user.user_metadata?.district_id,
        districtName: user.user_metadata?.district_name,
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
      include: {
        district: true,
        shelter: true,
      },
    });

    if (existing) {
      return existing;
    }

    // Resolve districtId by districtName if districtId is not directly provided
    let resolvedDistrictId = input.districtId;
    if (!resolvedDistrictId && input.districtName) {
      const dist = await prisma.district.findFirst({
        where: { name: { equals: input.districtName, mode: "insensitive" } },
      });
      if (dist) {
        resolvedDistrictId = dist.id;
      }
    }

    return await prisma.profile.create({
      data: {
        id: input.id,
        email: input.email || undefined,
        fullName: input.fullName,
        phone: input.phone || undefined,
        role: role,
        verificationStatus: verificationStatus,
        districtId: resolvedDistrictId || undefined,
        shelterId: input.shelterId || undefined,
      },
      include: {
        district: true,
        shelter: true,
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
