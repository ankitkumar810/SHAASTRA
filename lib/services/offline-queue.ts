export type OfflineOpType = "MARK_SAFE" | "RECONNECTION_REQUEST" | "SHELTER_UPDATE";
export type PacketStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "EXPIRED" | "CONFLICT";

export interface OfflinePacket<T = any> {
  packetId: string;
  operationType: OfflineOpType;
  payload: T;
  createdAt: string; // ISO
  lastKnownTimestamp: string; // ISO
  ttl: number; // Seconds (default 86400 = 24h)
  retryCount: number;
  status: PacketStatus;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = "shaastra_offline_queue_v1";

function encodePayload(obj: any): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return JSON.stringify(obj);
  }
}

function decodePayload(str: string): any {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
}

export function getOfflineQueue(): OfflinePacket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: Array<Omit<OfflinePacket, "payload"> & { payloadStr: string }> = JSON.parse(raw);
    return parsed.map((item) => ({
      ...item,
      payload: decodePayload(item.payloadStr),
    }));
  } catch (e) {
    console.error("Failed to read offline queue:", e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflinePacket[]): void {
  if (typeof window === "undefined") return;
  try {
    const serializable = queue.map((item) => ({
      packetId: item.packetId,
      operationType: item.operationType,
      payloadStr: encodePayload(item.payload),
      createdAt: item.createdAt,
      lastKnownTimestamp: item.lastKnownTimestamp,
      ttl: item.ttl,
      retryCount: item.retryCount,
      status: item.status,
      lastError: item.lastError,
    }));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.error("Failed to save offline queue:", e);
  }
}

export function enqueueOfflineAction<T>(
  operationType: OfflineOpType,
  payload: T,
  ttlSeconds: number = 86400
): OfflinePacket<T> {
  const nowIso = new Date().toISOString();
  const randomHex = Math.random().toString(36).substring(2, 8);
  const packetId = `pkt_${operationType.toLowerCase()}_${Date.now()}_${randomHex}`;

  const packet: OfflinePacket<T> = {
    packetId,
    operationType,
    payload,
    createdAt: nowIso,
    lastKnownTimestamp: nowIso,
    ttl: ttlSeconds,
    retryCount: 0,
    status: "PENDING",
  };

  const queue = getOfflineQueue();
  queue.push(packet);
  saveOfflineQueue(queue);

  return packet;
}

export async function processOfflineQueueSync(): Promise<{
  syncedCount: number;
  failedCount: number;
  expiredCount: number;
}> {
  const queue = getOfflineQueue();
  const pending = queue.filter((p) => p.status === "PENDING" || p.status === "FAILED");

  if (pending.length === 0) {
    return { syncedCount: 0, failedCount: 0, expiredCount: 0 };
  }

  // Mark pending as SYNCING
  pending.forEach((p) => (p.status = "SYNCING"));
  saveOfflineQueue(queue);

  let syncedCount = 0;
  let failedCount = 0;
  let expiredCount = 0;

  try {
    const res = await fetch("/api/v1/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packets: pending }),
    });

    const json = await res.json();

    if (json.success && Array.isArray(json.results)) {
      const resultMap = new Map<string, { status: PacketStatus; error?: string }>(
        json.results.map((r: any) => [r.packetId, { status: r.status, error: r.error }])
      );

      queue.forEach((p) => {
        const result = resultMap.get(p.packetId);
        if (result) {
          p.status = result.status;
          if (result.error) p.lastError = result.error;
          if (result.status === "SYNCED" || result.status === "CONFLICT") syncedCount++;
          if (result.status === "EXPIRED") expiredCount++;
          if (result.status === "FAILED") {
            failedCount++;
            p.retryCount += 1;
          }
        }
      });
    }
  } catch (err) {
    console.error("Offline sync error:", err);
    pending.forEach((p) => {
      p.status = "FAILED";
      p.retryCount += 1;
      p.lastError = err instanceof Error ? err.message : "Network request failed";
      failedCount++;
    });
  }

  // Retain un-synced items, prune synced after keeping log
  const activeQueue = queue.filter((p) => p.status !== "SYNCED" || p.retryCount > 0);
  saveOfflineQueue(activeQueue);

  return { syncedCount, failedCount, expiredCount };
}
