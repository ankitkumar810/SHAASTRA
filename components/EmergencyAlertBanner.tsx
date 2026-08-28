"use client";

import { useState } from "react";
import Link from "next/link";

export interface AlertCardProps {
  id: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  districtName?: string;
  source?: string;
  issuedAt?: string | Date;
  expiresAt?: string | Date;
  actionUrl?: string;
  actionLabel?: string;
}

export function EmergencyAlertBanner({
  alerts,
}: {
  alerts: AlertCardProps[];
}) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const activeAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));
  if (activeAlerts.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
      {activeAlerts.map((alert) => {
        const isCritical = alert.severity === "CRITICAL";
        const isWarning = alert.severity === "WARNING";

        const bg = isCritical ? "#fff2f0" : isWarning ? "#fff9eb" : "#eef9f8";
        const border = isCritical ? "#f8b4ab" : isWarning ? "#f2d28d" : "#bce8e3";
        const color = isCritical ? "#b64b3d" : isWarning ? "#8a6d13" : "#087d7a";
        const badgeBg = isCritical ? "#b64b3d" : isWarning ? "#8a6d13" : "#087d7a";

        return (
          <div
            key={alert.id}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderLeft: `6px solid ${badgeBg}`,
              borderRadius: "10px",
              padding: "16px 20px",
              boxShadow: isCritical ? "0 4px 16px rgba(182,75,61,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    background: badgeBg,
                    color: "white",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {isCritical ? "🔴 CRITICAL ALERT" : isWarning ? "🟠 WARNING" : "🔵 ADVISORY"}
                </span>

                <span style={{ fontSize: "12px", fontWeight: 700, color: color }}>
                  📍 {alert.districtName || "Ernakulam District"}
                </span>

                <span style={{ fontSize: "11px", color: "#71858a" }}>
                  Source: {alert.source || "NDMA / District Disaster Authority"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDismissedIds((prev) => [...prev, alert.id])}
                style={{ background: "transparent", border: 0, color: "#71858a", fontSize: "18px", cursor: "pointer" }}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>

            <h4 style={{ font: "700 17px Outfit", margin: "4px 0 6px", color: "#17323b" }}>{alert.title}</h4>
            <p style={{ fontSize: "13px", color: "#17323b", margin: "0 0 12px", lineHeight: 1.4 }}>{alert.description}</p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderTop: `1px solid ${border}`, paddingTop: "10px" }}>
              <div style={{ fontSize: "11px", color: "#71858a" }}>
                Issued: {alert.issuedAt ? new Date(alert.issuedAt).toLocaleTimeString() : "Live"} · Valid until: {alert.expiresAt ? new Date(alert.expiresAt).toLocaleTimeString() : "Further notice"}
              </div>

              {alert.actionUrl ? (
                <Link
                  href={alert.actionUrl}
                  style={{
                    background: badgeBg,
                    color: "white",
                    textDecoration: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {alert.actionLabel || "Recommended Action →"}
                </Link>
              ) : (
                <a
                  href="tel:112"
                  style={{
                    background: badgeBg,
                    color: "white",
                    textDecoration: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  Emergency Helpline 112 📞
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
