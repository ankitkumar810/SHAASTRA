"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type SharingMode = "once" | "1h" | "indefinite";
type SharingStatus = "idle" | "requesting" | "live" | "last_seen" | "denied" | "error";

interface CheckinState {
  status: SharingStatus;
  consentId?: string;
  lastSeen?: Date;
  expiresAt?: Date;
  errorMessage?: string;
}

interface OfflineQueueItem {
  latitude: number;
  longitude: number;
  accuracy?: number;
  duration: SharingMode;
  queuedAt: string;
}

const OFFLINE_QUEUE_KEY = "shaastra_gps_queue";
const CONSENT_KEY = "shaastra_consent_state";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hour ago";
  return `${diffHr} hours ago`;
}

function loadOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineQueueItem[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* storage full */ }
}

async function flushOfflineQueue() {
  const queue = loadOfflineQueue();
  if (queue.length === 0) return;

  const item = queue[0];
  try {
    const res = await fetch("/api/v1/location/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item }),
    });
    if (res.ok) {
      saveOfflineQueue(queue.slice(1));
    }
  } catch { /* still offline */ }
}

export function GpsCheckin() {
  const [state, setState] = useState<CheckinState>({ status: "idle" });
  const [selectedMode, setSelectedMode] = useState<SharingMode>("once");
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tick, setTick] = useState(0); // force re-render for relative time

  // Online/offline detection + queue flush
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue().then(() => setQueueCount(loadOfflineQueue().length));
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    setQueueCount(loadOfflineQueue().length);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Tick every 30s to update "last seen X minutes ago" label
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Restore any persisted consent state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as CheckinState & { lastSeen?: string; expiresAt?: string };
      const expiresAt = saved.expiresAt ? new Date(saved.expiresAt) : undefined;
      if (expiresAt && expiresAt < new Date()) {
        // Expired — show last_seen
        setState({
          status: "last_seen",
          consentId: saved.consentId,
          lastSeen: saved.lastSeen ? new Date(saved.lastSeen) : new Date(),
        });
      } else if (saved.status === "live") {
        setState({ ...saved, lastSeen: saved.lastSeen ? new Date(saved.lastSeen) : undefined, expiresAt });
      }
    } catch { /* ignore */ }
  }, []);

  const persistState = useCallback((s: CheckinState) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(s));
    } catch { /* ignore */ }
  }, []);

  const sendCheckin = useCallback(async (
    latitude: number,
    longitude: number,
    accuracy: number | undefined,
    duration: SharingMode,
    existingConsentId?: string,
  ): Promise<string | null> => {
    const endpoint = existingConsentId
      ? "/api/v1/location/consent/update"
      : "/api/v1/location/consent";
    const method = existingConsentId ? "PATCH" : "POST";

    if (!isOnline) {
      const queue = loadOfflineQueue();
      queue.push({ latitude, longitude, accuracy, duration, queuedAt: new Date().toISOString() });
      saveOfflineQueue(queue);
      setQueueCount(queue.length);
      return null;
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, accuracy, duration }),
      });
      const json = await res.json();
      if (json.success) return json.consentId || existingConsentId || null;
      return null;
    } catch {
      // Queue for later
      const queue = loadOfflineQueue();
      queue.push({ latitude, longitude, accuracy, duration, queuedAt: new Date().toISOString() });
      saveOfflineQueue(queue);
      setQueueCount(queue.length);
      return null;
    }
  }, [isOnline]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    try {
      await fetch("/api/v1/location/consent", { method: "DELETE" });
    } catch { /* ignore */ }
    const newState: CheckinState = { status: "idle" };
    setState(newState);
    try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ }
  }, []);

  const startSharing = useCallback(() => {
    setState({ status: "requesting" });

    if (!navigator.geolocation) {
      setState({ status: "error", errorMessage: "Geolocation is not supported by your browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const consentId = await sendCheckin(latitude, longitude, accuracy ?? undefined, selectedMode);
        const now = new Date();
        let expiresAt: Date | undefined;
        if (selectedMode === "once") expiresAt = new Date(now.getTime() + 5 * 60000);
        if (selectedMode === "1h") expiresAt = new Date(now.getTime() + 60 * 60000);

        const newState: CheckinState = {
          status: "live",
          consentId: consentId ?? undefined,
          lastSeen: now,
          expiresAt,
        };
        setState(newState);
        persistState(newState);

        if (selectedMode === "indefinite") {
          // Watch position continuously
          watchIdRef.current = navigator.geolocation.watchPosition(
            async (upd) => {
              const cid = newState.consentId;
              await sendCheckin(upd.coords.latitude, upd.coords.longitude, upd.coords.accuracy ?? undefined, "indefinite", cid);
              const updState: CheckinState = { ...newState, lastSeen: new Date() };
              setState(updState);
              persistState(updState);
            },
            () => { /* ignore individual watch errors */ },
            { enableHighAccuracy: true, maximumAge: 30000 }
          );
        } else if (selectedMode === "1h") {
          // Update every 5 minutes for 1h
          let count = 0;
          updateIntervalRef.current = setInterval(async () => {
            count++;
            if (count >= 12) { // 12 × 5min = 60min
              clearInterval(updateIntervalRef.current!);
              const expState: CheckinState = { status: "last_seen", lastSeen: new Date() };
              setState(expState);
              persistState(expState);
              return;
            }
            navigator.geolocation.getCurrentPosition(async (p) => {
              const cid = newState.consentId;
              await sendCheckin(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? undefined, "1h", cid);
              const refreshed: CheckinState = { ...newState, lastSeen: new Date() };
              setState(refreshed);
              persistState(refreshed);
            });
          }, 5 * 60 * 1000);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({ status: "denied" });
        } else {
          setState({ status: "error", errorMessage: "Unable to get your location. Please try again." });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [selectedMode, sendCheckin, persistState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  const isExpired = state.expiresAt && state.expiresAt < new Date();
  const effectiveStatus: SharingStatus = isExpired ? "last_seen" : state.status;

  const statusBadge = {
    idle: null,
    requesting: { bg: "#f0f7ff", color: "#2563eb", text: "📡 Requesting location…" },
    live: { bg: "#e2f6ed", color: "#087b68", text: "📡 LIVE — Location sharing active" },
    last_seen: { bg: "#fff9eb", color: "#8a6d13", text: `🕐 Last seen ${state.lastSeen ? formatRelativeTime(state.lastSeen) : "recently"}` },
    denied: { bg: "#fee8e4", color: "#b64b3d", text: "🚫 Location permission denied" },
    error: { bg: "#fee8e4", color: "#b64b3d", text: `⚠️ ${state.errorMessage || "Location unavailable"}` },
  }[effectiveStatus];

  return (
    <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "24px", maxWidth: "480px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ font: "700 20px Outfit", margin: "0 0 6px", color: "#17323b" }}>📍 GPS Safety Check-in</h2>
        <p style={{ fontSize: "13px", color: "#71858a", margin: 0 }}>
          Share your location so family and relief teams can find you. Your exact coordinates are never shown publicly.
        </p>
      </div>

      {/* Offline / Queue Warning */}
      {(!isOnline || queueCount > 0) && (
        <div style={{ background: "#fff9eb", border: "1px solid #f2d28d", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#8a6d13" }}>
          {!isOnline
            ? `⚡ Offline — check-in will be sent automatically when connected${queueCount > 0 ? ` (${queueCount} queued)` : ""}.`
            : `⚡ ${queueCount} queued check-in(s) being synced…`}
        </div>
      )}

      {/* Status Badge */}
      {statusBadge && (
        <div style={{
          background: statusBadge.bg,
          color: statusBadge.color,
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}>
          {statusBadge.text}
        </div>
      )}

      {(effectiveStatus === "idle" || effectiveStatus === "denied" || effectiveStatus === "error" || effectiveStatus === "last_seen") && (
        <>
          {/* Mode Selection */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#71858a", letterSpacing: "0.8px", textTransform: "uppercase", margin: "0 0 10px" }}>
              How long to share
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(["once", "1h", "indefinite"] as SharingMode[]).map((mode) => {
                const labels: Record<SharingMode, { title: string; desc: string }> = {
                  once: { title: "Share once", desc: "Send your location right now (5-min window)" },
                  "1h": { title: "Share for 1 hour", desc: "Update every 5 minutes for 1 hour, then stop" },
                  indefinite: { title: "Keep sharing", desc: "Live updates until you manually stop" },
                };
                const isSelected = selectedMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: `2px solid ${isSelected ? "#087d7a" : "#dce7e6"}`,
                      background: isSelected ? "#e2f6ed" : "white",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 600, color: isSelected ? "#087b68" : "#17323b" }}>
                      {labels[mode].title}
                    </span>
                    <span style={{ fontSize: "12px", color: "#71858a" }}>{labels[mode].desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={startSharing}
            disabled={state.status === "requesting"}
            style={{
              width: "100%",
              padding: "14px",
              background: "#087d7a",
              color: "white",
              border: 0,
              borderRadius: "10px",
              font: "700 16px 'DM Sans', sans-serif",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            📍 Check In Now
          </button>

          {effectiveStatus === "denied" && (
            <p style={{ fontSize: "12px", color: "#71858a", marginTop: "12px", textAlign: "center" }}>
              To enable location access, go to your browser settings and allow location for this site.
            </p>
          )}
        </>
      )}

      {effectiveStatus === "live" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "13px", color: "#577276", margin: 0 }}>
            Your location is being shared with relief coordinators. Your exact GPS coordinates are never shown publicly — only authorized personnel can access them.
          </p>
          <button
            onClick={stopSharing}
            style={{
              padding: "12px",
              background: "#fee8e4",
              color: "#b64b3d",
              border: "1px solid #f8cdcd",
              borderRadius: "10px",
              font: "600 14px 'DM Sans', sans-serif",
              cursor: "pointer",
            }}
          >
            🛑 Stop Sharing & Revoke Consent
          </button>
        </div>
      )}

      {effectiveStatus === "requesting" && (
        <p style={{ fontSize: "13px", color: "#71858a", textAlign: "center", marginTop: "12px" }}>
          Waiting for location permission from your browser…
        </p>
      )}

      {/* Privacy notice */}
      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f0f6f5", fontSize: "11px", color: "#91a2a4" }}>
        🔒 Your precise location is encrypted in transit and only accessible to verified district authorities. Consent can be revoked at any time. Location data is not used for advertising.
      </div>
    </div>
  );
}

export default GpsCheckin;

