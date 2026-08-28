"use client";

import { useState, useEffect, useCallback } from "react";
import { getOfflineQueue, processOfflineQueueSync } from "@/lib/services/offline-queue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updateStatus = useCallback(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const queue = getOfflineQueue();
    const pending = queue.filter((p) => p.status === "PENDING" || p.status === "FAILED");
    setPendingCount(pending.length);
  }, []);

  const handleTriggerSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await processOfflineQueueSync();
      updateStatus();
    } catch (e) {
      console.error("Manual sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateStatus]);

  useEffect(() => {
    // Read initial status asynchronously after mount
    const timer = setTimeout(() => {
      updateStatus();
    }, 0);

    const handleOnline = () => {
      setIsOnline(true);
      handleTriggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(updateStatus, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [updateStatus, handleTriggerSync]);

  return (
    <div style={{ position: "fixed", left: "24px", bottom: "24px", zIndex: 40, display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Offline Emergency Disclaimer Bar */}
      {!isOnline && (
        <div
          style={{
            background: "#fff0ed",
            border: "1px solid #f8b4ab",
            color: "#b64b3d",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>📡</span>
          <span>Offline Mode — Cached Info May Not Reflect Live Ground Conditions</span>
        </div>
      )}

      {/* Connectivity Badge */}
      <div
        style={{
          background: "white",
          border: "1px solid #dce7e6",
          borderRadius: "20px",
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: isSyncing ? "#e89d2e" : isOnline ? "#087b68" : "#b64b3d",
            display: "inline-block",
          }}
        />

        <span style={{ color: "#17323b" }}>
          {isSyncing ? "Syncing..." : isOnline ? "Online" : "Offline"}
        </span>

        {pendingCount > 0 && (
          <span style={{ background: "#fff1d9", color: "#aa6a13", padding: "2px 7px", borderRadius: "10px", fontSize: "11px" }}>
            {pendingCount} Pending
          </span>
        )}

        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            type="button"
            onClick={handleTriggerSync}
            style={{ background: "#087d7a", color: "white", border: 0, padding: "2px 8px", borderRadius: "10px", fontSize: "11px", cursor: "pointer" }}
          >
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
}
