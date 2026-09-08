"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export interface ShelterMapMarker {
  id: string;
  name: string;
  locality: string;
  availableBeds: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

export interface AlertZoneMarker {
  id: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  latitude: number;
  longitude: number;
  areaName?: string;
  issuedAt?: string | Date;
  source?: string;
}

export interface IncidentMarker {
  id: string;
  title: string;
  hazardType: string;
  severity: string;
  latitude: number;
  longitude: number;
  summary: string;
  isLive: boolean;
  source: string;
  state: string;
}

export interface MissingPersonMapMarker {
  id: string;
  name: string;
  status: string;
  locationName?: string | null;
  lastSeenLatitude: number;
  lastSeenLongitude: number;
  lastSeenAt?: string | Date | null;
}

export interface HazardReportMarker {
  id: string;
  hazardType: string;
  locationName: string;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
}

export interface SafeCheckinMarker {
  id: string;
  fullName: string;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
}

interface LayerVisibility {
  shelters: boolean;
  alerts: boolean;
  incidents: boolean;
  missingPersons: boolean;
  hazardReports: boolean;
  safeCheckins: boolean;
}

interface ShelterMapProps {
  shelters: ShelterMapMarker[];
  alerts?: AlertZoneMarker[];
  incidents?: IncidentMarker[];
  missingPersons?: MissingPersonMapMarker[];
  hazardReports?: HazardReportMarker[];
  safeCheckins?: SafeCheckinMarker[];
  showLayerToggles?: boolean;
  selectedShelterId?: string;
  onSelectShelter?: (id: string) => void;
}

export function ShelterMap({
  shelters, alerts = [], incidents = [], missingPersons = [],
  hazardReports = [], safeCheckins = [],
  showLayerToggles = false, selectedShelterId, onSelectShelter,
}: ShelterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const layerGroupsRef = useRef<Record<string, any>>({});

  const [layers, setLayers] = useState<LayerVisibility>({
    shelters: true, alerts: true, incidents: true,
    missingPersons: true, hazardReports: true, safeCheckins: false,
  });

  const validShelters = shelters.filter(
    (s): s is ShelterMapMarker & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null && !isNaN(s.latitude) && !isNaN(s.longitude)
  );
  const missingCoordsCount = shelters.length - validShelters.length;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if ((containerRef.current as any)._leaflet_id) {
      mapRef.current?.invalidateSize();
      return;
    }

    import("leaflet").then((L) => {
      if (!containerRef.current || (containerRef.current as any)._leaflet_id) return;

      const initialLat = validShelters[0]?.latitude ?? 10.0;
      const initialLng = validShelters[0]?.longitude ?? 76.3;
      const map = L.map(containerRef.current).setView([initialLat, initialLng], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;
      markersRef.current.clear();

      // ── Helper: create a named layer group ──
      const makeGroup = (key: string) => {
        const g = L.layerGroup().addTo(map);
        layerGroupsRef.current[key] = g;
        return g;
      };

      // ── ALERT ZONES ──
      const alertGroup = makeGroup("alerts");
      alerts.filter(a => !isNaN(a.latitude) && !isNaN(a.longitude)).forEach((alert) => {
        const color = alert.severity === "CRITICAL" ? "#D94B3D" : alert.severity === "WARNING" ? "#E39A2B" : "#F2C94C";
        const circle = L.circle([alert.latitude, alert.longitude], {
          color, fillColor: color, fillOpacity: 0.22, weight: 2, radius: 1400,
        }).addTo(alertGroup);
        circle.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:200px;">
            <span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;">${alert.severity} ALERT ZONE</span>
            <strong style="font-size:14px;color:#17323b;display:block;margin-top:6px;">${alert.title}</strong>
            <p style="font-size:12px;color:#577276;margin:4px 0 8px;">${alert.description}</p>
            <div style="font-size:11px;color:#71858a;border-top:1px solid #eee;padding-top:6px;">
              📍 Approx. Zone (${alert.areaName || "District Area"})<br/><em>May not reflect exact geographic boundaries.</em>
            </div>
          </div>`);
      });

      // ── SHELTERS ──
      const shelterGroup = makeGroup("shelters");
      validShelters.forEach((shelter) => {
        const color = shelter.status === "OPEN" ? "#087D7A" : shelter.status === "LIMITED" ? "#E39A2B" : "#D94B3D";
        const iconHtml = `<div style="background:${color};color:white;font-weight:bold;font-size:12px;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg);">${shelter.availableBeds}</span></div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [34, 34], iconAnchor: [17, 34] });
        const marker = L.marker([shelter.latitude, shelter.longitude], { icon }).addTo(shelterGroup);
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`;
        marker.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:180px;">
            <strong style="font-size:14px;color:#17323b;">${shelter.name}</strong><br/>
            <span style="font-size:12px;color:#71858a;">⌖ ${shelter.locality}</span><br/>
            <div style="margin-top:6px;font-size:12px;color:#087D7A;"><b>${shelter.availableBeds} beds available</b></div>
            <div style="margin-top:8px;display:flex;gap:10px;font-size:12px;">
              <a href="/dashboard/citizen/shelters/${shelter.id}" style="color:#087D7A;text-decoration:none;font-weight:600;">View Details →</a>
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="color:#075c63;text-decoration:none;font-weight:600;">Get Directions ↗</a>
            </div>
          </div>`);
        if (onSelectShelter) marker.on("click", () => onSelectShelter(shelter.id));
        markersRef.current.set(shelter.id, marker);
      });

      // ── INCIDENTS (case studies + live) ──
      const incidentGroup = makeGroup("incidents");
      incidents.filter(i => i.latitude && i.longitude && !isNaN(i.latitude) && !isNaN(i.longitude)).forEach((inc) => {
        const color = inc.severity === "CRITICAL" ? "#7c1d1d" : inc.severity === "HIGH" ? "#D94B3D" : "#E39A2B";
        const badge = inc.isLive ? "🔴 LIVE INCIDENT" : "📋 CASE STUDY";
        const iconHtml = `<div style="background:${color};color:white;width:32px;height:32px;border-radius:6px;display:grid;place-items:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">🌊</div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [32, 32], iconAnchor: [16, 32] });
        const marker = L.marker([inc.latitude!, inc.longitude!], { icon }).addTo(incidentGroup);
        marker.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:210px;">
            <span style="background:${inc.isLive ? "#D94B3D" : "#6b7280"};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;">${badge}</span>
            <strong style="font-size:14px;color:#17323b;display:block;margin-top:6px;">${inc.title}</strong>
            <p style="font-size:12px;color:#577276;margin:4px 0 6px;line-height:1.4;">${inc.summary.substring(0, 120)}${inc.summary.length > 120 ? "…" : ""}</p>
            <div style="font-size:11px;color:#91a2a4;">Source: ${inc.source} · ${inc.state}</div>
          </div>`);
      });

      // ── MISSING PERSONS ──
      const mpGroup = makeGroup("missingPersons");
      missingPersons.filter(p => p.lastSeenLatitude && p.lastSeenLongitude).forEach((person) => {
        const color = person.status === "MISSING" ? "#D94B3D" : person.status === "LOCATED" ? "#E39A2B" : "#087D7A";
        const iconHtml = `<div style="background:${color};color:white;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">🔍</div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [30, 30], iconAnchor: [15, 30] });
        const marker = L.marker([person.lastSeenLatitude, person.lastSeenLongitude], { icon }).addTo(mpGroup);
        marker.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:180px;">
            <span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;">${person.status}</span>
            <strong style="font-size:14px;color:#17323b;display:block;margin-top:6px;">${person.name}</strong>
            ${person.locationName ? `<p style="font-size:12px;color:#71858a;margin:4px 0;">📍 Last seen: ${person.locationName}</p>` : ""}
            <div style="font-size:10px;color:#91a2a4;font-style:italic;margin-top:4px;">Last known location — not a live position.</div>
          </div>`);
      });

      // ── HAZARD REPORTS ──
      const hazardGroup = makeGroup("hazardReports");
      hazardReports.filter(h => h.latitude && h.longitude).forEach((report) => {
        const iconHtml = `<div style="background:#7c1d1d;color:white;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">📷</div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [28, 28], iconAnchor: [14, 28] });
        const marker = L.marker([report.latitude, report.longitude], { icon }).addTo(hazardGroup);
        marker.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:170px;">
            <span style="background:#7c1d1d;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;">HAZARD REPORT</span>
            <strong style="font-size:14px;color:#17323b;display:block;margin-top:6px;">${report.hazardType}</strong>
            <p style="font-size:12px;color:#71858a;margin:4px 0;">📍 ${report.locationName}</p>
          </div>`);
      });

      // ── SAFE CHECK-INS (blurred — authority view only) ──
      const checkinGroup = makeGroup("safeCheckins");
      safeCheckins.filter(c => c.latitude && c.longitude).forEach((checkin) => {
        const iconHtml = `<div style="background:#2563eb;color:white;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.25);"></div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [16, 16], iconAnchor: [8, 8] });
        const marker = L.marker([checkin.latitude, checkin.longitude], { icon }).addTo(checkinGroup);
        marker.bindPopup(`<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#17323b;">📡 Safe check-in registered<br/><span style="color:#71858a;">Authority view only</span></div>`);
      });

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [shelters, alerts, incidents, missingPersons, hazardReports, safeCheckins, onSelectShelter]);

  // Toggle layer visibility
  useEffect(() => {
    const groups = layerGroupsRef.current;
    const map = mapRef.current;
    if (!map) return;
    const entries: [keyof LayerVisibility, string][] = [
      ["shelters", "shelters"], ["alerts", "alerts"], ["incidents", "incidents"],
      ["missingPersons", "missingPersons"], ["hazardReports", "hazardReports"], ["safeCheckins", "safeCheckins"],
    ];
    entries.forEach(([key, groupKey]) => {
      const g = groups[groupKey];
      if (!g) return;
      if (layers[key]) { if (!map.hasLayer(g)) g.addTo(map); }
      else { if (map.hasLayer(g)) map.removeLayer(g); }
    });
  }, [layers]);

  // Selected shelter focus
  useEffect(() => {
    if (!selectedShelterId || !mapRef.current) return;
    const target = validShelters.find((s) => s.id === selectedShelterId);
    const marker = markersRef.current.get(selectedShelterId);
    if (target && marker && mapRef.current) {
      mapRef.current.flyTo([target.latitude, target.longitude], 14, { duration: 1.2 });
      marker.openPopup();
    }
  }, [selectedShelterId, validShelters]);

  const toggleLayer = (key: keyof LayerVisibility) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const layerDefs: { key: keyof LayerVisibility; label: string; color: string; emoji: string }[] = [
    { key: "shelters", label: "Shelters", color: "#087D7A", emoji: "🏠" },
    { key: "alerts", label: "Alert Zones", color: "#D94B3D", emoji: "⚠️" },
    { key: "incidents", label: "Incidents", color: "#7c1d1d", emoji: "🌊" },
    { key: "missingPersons", label: "Missing Persons", color: "#D94B3D", emoji: "🔍" },
    { key: "hazardReports", label: "Hazard Reports", color: "#7c1d1d", emoji: "📷" },
    { key: "safeCheckins", label: "Safe Check-ins", color: "#2563eb", emoji: "📡" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "450px" }}>
      {missingCoordsCount > 0 && (
        <div style={{ position: "absolute", top: "10px", left: "10px", right: showLayerToggles ? "220px" : "10px", zIndex: 10, background: "rgba(255,255,255,0.94)", border: "1px solid #dce7e6", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#71858a", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          ℹ️ {missingCoordsCount} shelter(s) missing GPS coordinates — shown in list view only.
        </div>
      )}

      {/* Layer Toggles (authority view) */}
      {showLayerToggles && (
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10, background: "rgba(255,255,255,0.97)", border: "1px solid #dce7e6", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: "6px", minWidth: "180px" }}>
          <span style={{ font: "700 11px 'DM Sans'", color: "#71858a", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>Map Layers</span>
          {layerDefs.map(({ key, label, color, emoji }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: layers[key] ? "#17323b" : "#91a2a4" }}>
              <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} style={{ accentColor: color }} />
              <span>{emoji} {label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Map Legend */}
      <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 10, background: "rgba(255,255,255,0.95)", border: "1px solid #dce7e6", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", fontWeight: 600, color: "#17323b", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ color: "#087D7A" }}>●</span> Open Shelter</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ color: "#E39A2B" }}>●</span> Limited Space</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ color: "#D94B3D" }}>🔴</span> Alert Zone</span>
        {incidents.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span>🌊</span> Incident</span>}
        {missingPersons.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span>🔍</span> Missing</span>}
        {hazardReports.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span>📷</span> Hazard</span>}
      </div>

      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "450px", borderRadius: "12px", overflow: "hidden", border: "1px solid #dce7e6" }} />
    </div>
  );
}

