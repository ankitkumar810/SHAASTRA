"use client";

import { useEffect, useRef } from "react";
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

interface ShelterMapProps {
  shelters: ShelterMapMarker[];
  alerts?: AlertZoneMarker[];
  selectedShelterId?: string;
  onSelectShelter?: (id: string) => void;
}

export function ShelterMap({ shelters, alerts = [], selectedShelterId, onSelectShelter }: ShelterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Filter shelters that have REAL non-null coordinates
  const validShelters = shelters.filter(
    (s): s is ShelterMapMarker & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null && !isNaN(s.latitude) && !isNaN(s.longitude)
  );

  const validAlerts = alerts.filter(
    (a): a is AlertZoneMarker =>
      a.latitude !== null && a.longitude !== null && !isNaN(a.latitude) && !isNaN(a.longitude)
  );

  const missingCoordsCount = shelters.length - validShelters.length;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Prevent Leaflet error "Map container is already initialized"
    if ((containerRef.current as any)._leaflet_id) {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
      return;
    }

    import("leaflet").then((L) => {
      if (!containerRef.current || (containerRef.current as any)._leaflet_id) return;

      // Default center: Ernakulam, Kerala (10.0000, 76.3000)
      const initialLat = validShelters.length > 0 ? validShelters[0].latitude : 10.0000;
      const initialLng = validShelters.length > 0 ? validShelters[0].longitude : 76.3000;

      const map = L.map(containerRef.current).setView([initialLat, initialLng], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      markersRef.current.clear();

      // Add Alert Zone Circles (Visual Warning Radius based on real coordinates)
      validAlerts.forEach((alert) => {
        const color = alert.severity === "CRITICAL" ? "#D94B3D" : alert.severity === "WARNING" ? "#E39A2B" : "#F2C94C";

        const circle = L.circle([alert.latitude, alert.longitude], {
          color: color,
          fillColor: color,
          fillOpacity: 0.22,
          weight: 2,
          radius: 1400,
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family:'DM Sans', sans-serif; min-width:200px;">
            <span style="background:${color}; color:white; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; letter-spacing:1px; text-transform:uppercase;">
              ${alert.severity} ALERT ZONE
            </span>
            <strong style="font-size:14px; font-family:'Outfit', sans-serif; color:#17323b; display:block; margin-top:6px;">${alert.title}</strong>
            <p style="font-size:12px; color:#577276; margin:4px 0 8px; line-height:1.4;">${alert.description}</p>
            <div style="font-size:11px; color:#71858a; border-top:1px solid #eee; padding-top:6px;">
              📍 Approx. Zone (${alert.areaName || "District Area"})<br/>
              <em>May not reflect exact geographic boundaries.</em>
            </div>
          </div>
        `);
      });

      // Add REAL Shelter Markers
      validShelters.forEach((shelter) => {
        const lat = shelter.latitude;
        const lng = shelter.longitude;

        const color = shelter.status === "OPEN" ? "#087D7A" : shelter.status === "LIMITED" ? "#E39A2B" : "#D94B3D";

        const iconHtml = `<div class="shelter-map-pin" style="background:${color}; color:white; font-weight:bold; font-size:12px; width:34px; height:34px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:grid; place-items:center; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); transition: transform 0.15s ease-in-out;"><span style="transform:rotate(45deg);">${shelter.availableBeds}</span></div>`;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "",
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        marker.bindPopup(`
          <div style="font-family:'DM Sans', sans-serif; min-width:180px;">
            <strong style="font-size:14px; font-family:'Outfit', sans-serif; color:#17323b;">${shelter.name}</strong><br/>
            <span style="font-size:12px; color:#71858a;">⌖ ${shelter.locality}</span><br/>
            <div style="margin-top:6px; font-size:12px; color:#087D7A;"><b>${shelter.availableBeds} beds available</b></div>
            <div style="margin-top:8px; display:flex; gap:10px; font-size:12px;">
              <a href="/dashboard/citizen/shelters/${shelter.id}" style="color:#087D7A; text-decoration:none; font-weight:600;">View Details →</a>
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="color:#075c63; text-decoration:none; font-weight:600;">Get Directions ↗</a>
            </div>
          </div>
        `);

        if (onSelectShelter) {
          marker.on("click", () => onSelectShelter(shelter.id));
        }

        markersRef.current.set(shelter.id, marker);
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [shelters, alerts, onSelectShelter]);

  // Handle selected shelter focus & marker popup open
  useEffect(() => {
    if (!selectedShelterId || !mapRef.current) return;
    const targetShelter = validShelters.find((s) => s.id === selectedShelterId);
    const targetMarker = markersRef.current.get(selectedShelterId);

    if (targetShelter && targetMarker && mapRef.current) {
      mapRef.current.flyTo([targetShelter.latitude, targetShelter.longitude], 14, { duration: 1.2 });
      targetMarker.openPopup();
    }
  }, [selectedShelterId, validShelters]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "450px" }}>
      {missingCoordsCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            zIndex: 10,
            background: "rgba(255, 255, 255, 0.94)",
            border: "1px solid #dce7e6",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "#71858a",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          ℹ️ {missingCoordsCount} shelter(s) do not have verified GPS coordinates in database and are shown in the list view only.
        </div>
      )}

      {/* Map Legend Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.95)",
          border: "1px solid #dce7e6",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 600,
          color: "#17323b",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ color: "#087D7A" }}>●</span> Open Shelter</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ color: "#E39A2B" }}>●</span> Limited Space</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ color: "#D94B3D" }}>🔴</span> Alert Zone</span>
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "450px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #dce7e6",
        }}
      />
    </div>
  );
}
