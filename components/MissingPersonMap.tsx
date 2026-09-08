"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MissingPersonMarker {
  id: string;
  name: string;
  status: "MISSING" | "LOCATED" | "SAFE" | "REUNITED";
  locationName?: string | null;
  lastSeenLatitude?: number | null;
  lastSeenLongitude?: number | null;
  lastSeenAt?: string | Date | null;
  // Live location (only present if consent is active and caller is authorized)
  liveLatitude?: number | null;
  liveLongitude?: number | null;
  isLive?: boolean;
}

interface MissingPersonMapProps {
  persons: MissingPersonMarker[];
  /** If true, map shows only last-known markers. If false (authority view), also shows live markers. */
  publicView?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  MISSING: "#D94B3D",
  LOCATED: "#E39A2B",
  SAFE: "#087D7A",
  REUNITED: "#149166",
};

function formatTime(d?: string | Date | null): string {
  if (!d) return "Unknown";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function MissingPersonMap({ persons, publicView = true }: MissingPersonMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const validPersons = persons.filter(
    (p) =>
      (p.lastSeenLatitude !== null && p.lastSeenLatitude !== undefined) ||
      (p.isLive && p.liveLatitude !== null && p.liveLatitude !== undefined)
  );

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if ((containerRef.current as any)._leaflet_id) {
      mapRef.current?.invalidateSize();
      return;
    }

    import("leaflet").then((L) => {
      if (!containerRef.current || (containerRef.current as any)._leaflet_id) return;

      const defaultCenter: [number, number] = [10.0, 76.3];
      const first = validPersons[0];
      const center: [number, number] = first?.liveLatitude && first?.liveLongitude
        ? [first.liveLatitude, first.liveLongitude]
        : first?.lastSeenLatitude && first?.lastSeenLongitude
        ? [first.lastSeenLatitude, first.lastSeenLongitude]
        : defaultCenter;

      const map = L.map(containerRef.current).setView(center, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;

      validPersons.forEach((person) => {
        const hasLive = !publicView && person.isLive && person.liveLatitude && person.liveLongitude;
        const lat = hasLive ? person.liveLatitude! : person.lastSeenLatitude!;
        const lng = hasLive ? person.liveLongitude! : person.lastSeenLongitude!;
        if (!lat || !lng) return;

        const color = STATUS_COLORS[person.status] ?? "#555";
        const isLiveMarker = !!hasLive;

        // Live location: pulsing blue dot
        // Last known: grey/red pin with status
        const iconHtml = isLiveMarker
          ? `<div style="position:relative;width:20px;height:20px;">
               <div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3);animation:pulse 1.5s ease-out infinite;"></div>
             </div>`
          : `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:grid;place-items:center;">
               <span style="transform:rotate(45deg);font-size:14px;">🔍</span>
             </div>`;

        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [32, 32], iconAnchor: [16, 32] });
        const marker = L.marker([lat, lng], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:190px;">
            <span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;">
              ${isLiveMarker ? "📡 LIVE LOCATION" : "📍 LAST KNOWN LOCATION"}
            </span>
            <strong style="font-size:14px;font-family:'Outfit',sans-serif;color:#17323b;display:block;margin-top:6px;">${person.name}</strong>
            <span style="font-size:11px;font-weight:700;color:${color};display:block;margin:4px 0;">${person.status}</span>
            ${person.locationName ? `<p style="font-size:12px;color:#71858a;margin:0 0 4px;">📍 ${person.locationName}</p>` : ""}
            ${!isLiveMarker ? `<p style="font-size:11px;color:#91a2a4;margin:0;">Last seen: ${formatTime(person.lastSeenAt)}</p>` : ""}
            ${isLiveMarker ? `<p style="font-size:11px;color:#2563eb;margin:0;font-weight:600;">Live location — sharing active</p>` : ""}
            <div style="font-size:10px;color:#b0bec5;margin-top:6px;font-style:italic;">
              ${isLiveMarker ? "Live data shown to authorized personnel only." : "This is the last known location — not a live position."}
            </div>
          </div>
        `);
      });

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [persons, publicView, validPersons]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "400px" }}>
      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
          70% { box-shadow: 0 0 0 14px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
      `}</style>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: "12px", left: "12px", zIndex: 10,
        background: "rgba(255,255,255,0.95)", border: "1px solid #dce7e6",
        borderRadius: "8px", padding: "6px 12px", fontSize: "11px",
        fontWeight: 600, color: "#17323b", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        display: "flex", gap: "12px", flexWrap: "wrap",
      }}>
        <span style={{ color: "#D94B3D" }}>🔍 Missing</span>
        <span style={{ color: "#E39A2B" }}>🔍 Located</span>
        <span style={{ color: "#087D7A" }}>🔍 Safe</span>
        {!publicView && <span style={{ color: "#2563eb" }}>📡 Live Location</span>}
        <span style={{ color: "#91a2a4", fontWeight: 400 }}>
          {publicView ? "Showing last-known locations only." : "Authority view — precise GPS visible."}
        </span>
      </div>

      {validPersons.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          zIndex: 10, background: "rgba(255,255,255,0.9)", padding: "16px 24px",
          borderRadius: "10px", textAlign: "center", color: "#71858a", fontSize: "13px",
        }}>
          No location data available for current reports.
        </div>
      )}

      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: "400px", borderRadius: "12px", overflow: "hidden", border: "1px solid #dce7e6" }}
      />
    </div>
  );
}
