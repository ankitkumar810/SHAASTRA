import { prisma } from "@/lib/prisma";

export async function logAuditEvent(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | object | null;
  ipAddress?: string | null;
}) {
  try {
    const detailsString =
      typeof params.details === "object"
        ? JSON.stringify(params.details)
        : params.details || null;

    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: detailsString,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return null;
  }
}
