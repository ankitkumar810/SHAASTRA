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

export function sanitizeRole(requestedRole?: string): { role: Role; verificationStatus: VerificationStatus } {
  const normalized = (requestedRole || "CITIZEN").toUpperCase();

  if (normalized === "SHELTER_ADMIN" || normalized === "DISTRICT_AUTHORITY" || normalized === "SYSTEM_ADMIN") {
    // Privileged role requests require verification by a System Administrator
    return {
      role: normalized as Role,
      verificationStatus: "PENDING" as VerificationStatus,
    };
  }

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
        requestedRole: user.user_metadata?.requested_role,
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
  const { role, verificationStatus } = sanitizeRole(input.requestedRole);

  try {
    const existing = await prisma.profile.findUnique({
      where: { id: input.id },
    });

    if (existing) {
      return existing;
    }

    return await prisma.profile.create({
      data: {
        id: input.id,
        email: input.email || null,
        fullName: input.fullName || "SHAASTRA User",
        phone: input.phone || null,
        role: role,
        verificationStatus: verificationStatus,
        districtId: input.districtId || null,
        shelterId: input.shelterId || null,
      },
    });
  } catch (error) {
    console.error("Error syncing user profile:", error);
    return null;
  }
}

export function isRoleAuthorizedForDashboard(userRole: Role, verificationStatus: VerificationStatus, path: string): boolean {
  if (path.startsWith("/dashboard/admin")) {
    return userRole === "SYSTEM_ADMIN" && verificationStatus === "VERIFIED";
  }

  if (path.startsWith("/dashboard/authority")) {
    return (userRole === "DISTRICT_AUTHORITY" || userRole === "SYSTEM_ADMIN") && verificationStatus === "VERIFIED";
  }

  if (path.startsWith("/dashboard/shelter")) {
    return (userRole === "SHELTER_ADMIN" || userRole === "DISTRICT_AUTHORITY" || userRole === "SYSTEM_ADMIN") && verificationStatus === "VERIFIED";
  }

  if (path.startsWith("/dashboard/citizen")) {
    return true; // All authenticated users can access citizen dashboard
  }

  return true;
}

export function getDashboardPathForRole(role: Role): string {
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
