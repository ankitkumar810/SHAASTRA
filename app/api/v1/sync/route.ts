import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/services/audit";
import { createClient } from "@/lib/supabase/server";
import type { OfflinePacket } from "@/lib/services/offline-queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packets } = body as { packets: OfflinePacket[] };

    if (!Array.isArray(packets)) {
      return NextResponse.json({ success: false, error: "Invalid payload: 'packets' array required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const results: Array<{ packetId: string; status: string; error?: string }> = [];
    const now = new Date();

    for (const packet of packets) {
      try {
        // 1. Deduplication Check via AuditLog
        const existingAudit = await prisma.auditLog.findFirst({
          where: {
            details: { contains: packet.packetId },
          },
        });

        if (existingAudit) {
          results.push({ packetId: packet.packetId, status: "SYNCED" });
          continue;
        }

        // 2. TTL / Expiry Check
        const createdAtDate = new Date(packet.createdAt);
        const ageInSeconds = (now.getTime() - createdAtDate.getTime()) / 1000;

        if (packet.ttl && ageInSeconds > packet.ttl) {
          results.push({ packetId: packet.packetId, status: "EXPIRED", error: "Packet TTL expired before sync." });
          continue;
        }

        // 3. Operation Execution & Conflict Handling
        if (packet.operationType === "MARK_SAFE") {
          const { fullName, phone, shelterId, generalLocation, message } = packet.payload;

          const record = await prisma.safeRecord.create({
            data: {
              fullName: fullName || "Anonymous Evacuee",
              phone: phone || null,
              shelterId: shelterId || null,
              generalLocation: generalLocation || null,
              message: message || null,
              verificationStatus: "VERIFIED",
              registeredById: user?.id || null,
            },
          });

          await logAuditEvent({
            userId: user?.id || null,
            action: "OFFLINE_SYNC_MARK_SAFE",
            entity: "SafeRecord",
            entityId: record.id,
            details: `Packet ${packet.packetId} synced.`,
          });

          results.push({ packetId: packet.packetId, status: "SYNCED" });
        } else if (packet.operationType === "RECONNECTION_REQUEST") {
          const { requesterName, requesterContact, targetName, targetDetails } = packet.payload;

          const req = await prisma.reconnectionRequest.create({
            data: {
              requesterName: requesterName || "Anonymous Family Member",
              requesterContact: requesterContact || "Not provided",
              targetName: targetName || "Unknown Target",
              targetDetails: targetDetails || null,
              requesterId: user?.id || null,
            },
          });

          await logAuditEvent({
            userId: user?.id || null,
            action: "OFFLINE_SYNC_RECONNECTION",
            entity: "ReconnectionRequest",
            entityId: req.id,
            details: `Packet ${packet.packetId} synced.`,
          });

          results.push({ packetId: packet.packetId, status: "SYNCED" });
        } else if (packet.operationType === "SHELTER_UPDATE") {
          const { shelterId, occupiedBeds, totalBeds, status, notes } = packet.payload;

          const shelter = await prisma.shelter.findUnique({ where: { id: shelterId } });
          if (!shelter) {
            results.push({ packetId: packet.packetId, status: "FAILED", error: "Target shelter not found." });
            continue;
          }

          // Conflict Handling: If server shelter update is newer than offline lastKnownTimestamp
          const lastKnown = new Date(packet.lastKnownTimestamp);
          if (new Date(shelter.lastUpdated).getTime() > lastKnown.getTime()) {
            await logAuditEvent({
              userId: user?.id || null,
              action: "OFFLINE_SYNC_CONFLICT",
              entity: "Shelter",
              entityId: shelterId,
              details: `Packet ${packet.packetId} conflict: Server data newer than offline timestamp.`,
            });
            results.push({ packetId: packet.packetId, status: "CONFLICT", error: "Server data newer than offline snapshot." });
            continue;
          }

          const newTotal = totalBeds !== undefined ? Number(totalBeds) : shelter.totalBeds;
          const newOccupied = occupiedBeds !== undefined ? Number(occupiedBeds) : shelter.occupiedBeds;
          const newAvailable = Math.max(0, newTotal - newOccupied);

          await prisma.shelter.update({
            where: { id: shelterId },
            data: {
              totalBeds: newTotal,
              occupiedBeds: newOccupied,
              availableBeds: newAvailable,
              status: status || shelter.status,
              lastUpdated: new Date(),
            },
          });

          await logAuditEvent({
            userId: user?.id || null,
            action: "OFFLINE_SYNC_SHELTER_UPDATE",
            entity: "Shelter",
            entityId: shelterId,
            details: `Packet ${packet.packetId} synced.`,
          });

          results.push({ packetId: packet.packetId, status: "SYNCED" });
        } else {
          results.push({ packetId: packet.packetId, status: "FAILED", error: "Unknown operation type." });
        }
      } catch (itemError) {
        console.error(`Error processing packet ${packet.packetId}:`, itemError);
        results.push({
          packetId: packet.packetId,
          status: "FAILED",
          error: itemError instanceof Error ? itemError.message : "Processing error",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("POST /api/v1/sync error:", error);
    return NextResponse.json({ success: false, error: "Failed to process offline sync queue" }, { status: 500 });
  }
}
