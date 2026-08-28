"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import type { AssistantResponse } from "@/lib/services/ai";

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSourcesMap, setShowSourcesMap] = useState<Record<number, boolean>>({});

  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string; data?: AssistantResponse }>
  >([
    {
      role: "assistant",
      text: "SHAASTRA Emergency Assistant",
      data: {
        heading: "SHAASTRA Emergency Assistant",
        actionPoints: [
          "Find open shelters with live bed capacity nearby.",
          "Check safety action steps for floods or cyclones.",
          "Access emergency hotline numbers 112 and 1077.",
        ],
        primaryCta: { label: "Find Nearby Shelter →", href: "/dashboard/citizen/shelters" },
        sources: [],
        uncertainty: "Grounded in live SHAASTRA database facts.",
        escalationNeeded: false,
        emergencyContacts: [
          { name: "Emergency Helpline", number: "112" },
          { name: "District Disaster Room", number: "1077" },
        ],
        answer: "Emergency Assistant Ready.",
      },
    },
  ]);

  const toggleSources = (idx: number) => {
    setShowSourcesMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  async function handleSend(queryText?: string) {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, district: "Ernakulam" }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: json.data.heading || "Guidance",
            data: json.data,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "No Grounded Facts Found",
            data: {
              heading: "No Verified Facts Found",
              actionPoints: [
                "Could not retrieve specific shelter data for that query.",
                "For life safety emergencies, call National Helpline 112.",
              ],
              primaryCta: { label: "Call Emergency 112", href: "tel:112" },
              sources: [],
              uncertainty: "Real-time conditions may vary.",
              escalationNeeded: true,
              emergencyContacts: [{ name: "National Emergency", number: "112" }],
              answer: "Call 112 for emergency help.",
            },
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Connection Error",
          data: {
            heading: "Network Connection Issue",
            actionPoints: [
              "Connection interrupted. Please call emergency hotline 112.",
            ],
            primaryCta: { label: "Call Emergency 112", href: "tel:112" },
            sources: [],
            uncertainty: "Offline mode.",
            escalationNeeded: true,
            emergencyContacts: [{ name: "National Emergency", number: "112" }],
            answer: "Call 112.",
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend();
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          right: "24px",
          bottom: "24px",
          zIndex: 40,
          background: "#087d7a",
          color: "white",
          border: 0,
          borderRadius: "30px",
          padding: "12px 20px",
          font: "600 14px 'DM Sans', sans-serif",
          boxShadow: "0 8px 24px rgba(8,125,122,0.35)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "18px" }}>🤖</span>
        <span>{isOpen ? "Close Assistant" : "AI Emergency Assistant"}</span>
      </button>

      {/* Assistant Modal / Popup */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "84px",
            width: "min(430px, calc(100vw - 32px))",
            maxHeight: "620px",
            height: "78vh",
            background: "white",
            border: "1px solid #dce7e6",
            borderRadius: "16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ background: "#075c63", color: "white", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ font: "700 16px Outfit", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🤖</span> Emergency Guidance Assistant
              </h3>
              <span style={{ fontSize: "11px", color: "#8ee2d4" }}>Scannable · Actionable · Live Grounded Facts</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} style={{ background: "transparent", border: 0, color: "white", fontSize: "20px", cursor: "pointer" }}>
              ×
            </button>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", background: "#f7fbfa" }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ alignSelf: m.role === "user" ? "flex-end" : "stretch" }}>
                {m.role === "user" ? (
                  <div style={{ background: "#087d7a", color: "white", padding: "10px 14px", borderRadius: "14px 14px 2px 14px", fontSize: "13px", fontWeight: 600, maxWidth: "85%", marginLeft: "auto" }}>
                    {m.text}
                  </div>
                ) : (
                  <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "12px", padding: "16px", display: "grid", gap: "12px" }}>
                    {/* Emergency Banner */}
                    {m.data?.escalationNeeded && (
                      <div style={{ background: "#fff0ed", border: "1px solid #f8b4ab", color: "#b64b3d", padding: "10px 12px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>🚨 Life Emergency? Call Immediately:</span>
                        <a href="tel:112" style={{ background: "#b64b3d", color: "white", textDecoration: "none", padding: "5px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "13px" }}>
                          Call 112 📞
                        </a>
                      </div>
                    )}

                    {/* Scannable Heading */}
                    {m.data?.heading && (
                      <h4 style={{ font: "700 17px Outfit", margin: 0, color: "#17323b" }}>{m.data.heading}</h4>
                    )}

                    {/* 3-5 Concise Action Points */}
                    {m.data?.actionPoints && m.data.actionPoints.length > 0 && (
                      <div style={{ display: "grid", gap: "6px" }}>
                        {m.data.actionPoints.map((point, pIdx) => (
                          <div key={pIdx} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#17323b", lineHeight: 1.4 }}>
                            <span style={{ color: "#087d7a", fontWeight: "bold" }}>•</span>
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Compact Shelter Cards */}
                    {m.data?.shelters && m.data.shelters.length > 0 && (
                      <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#71858a", letterSpacing: "1px", textTransform: "uppercase" }}>
                          TOP AVAILABLE SHELTERS
                        </span>
                        {m.data.shelters.map((s) => (
                          <div key={s.id} style={{ background: "#fafdfc", border: "1px solid #dce7e6", borderRadius: "8px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ font: "600 14px Outfit", color: "#17323b", display: "block" }}>{s.name}</strong>
                              <span style={{ fontSize: "12px", color: "#71858a" }}>⌖ {s.locality}</span>
                              <div style={{ fontSize: "12px", marginTop: "4px", color: "#087b68" }}>
                                <strong>{s.availableBeds} beds available</strong> · {s.foodStockStatus}
                              </div>
                            </div>
                            <Link href={`/dashboard/citizen/shelters/${s.id}`} style={{ background: "#e2f6ed", color: "#087b68", textDecoration: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                              View Shelter →
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Primary Call to Action Button */}
                    {m.data?.primaryCta && (
                      <div style={{ marginTop: "4px" }}>
                        <Link href={m.data.primaryCta.href} style={{ display: "block", textAlign: "center", background: "#087d7a", color: "white", textDecoration: "none", padding: "10px", borderRadius: "8px", font: "600 13px 'DM Sans', sans-serif" }}>
                          {m.data.primaryCta.label}
                        </Link>
                      </div>
                    )}

                    {/* Secondary Collapsible Sources & Freshness Toggle */}
                    {m.data?.sources && m.data.sources.length > 0 && (
                      <div style={{ borderTop: "1px solid #f0f6f5", paddingTop: "8px", marginTop: "4px" }}>
                        <button
                          type="button"
                          onClick={() => toggleSources(idx)}
                          style={{ background: "transparent", border: 0, padding: 0, color: "#71858a", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                        >
                          {showSourcesMap[idx] ? "▼ Hide Grounded Sources & Technical Details" : "▶ View Grounded Sources & Technical Details"}
                        </button>

                        {showSourcesMap[idx] && (
                          <div style={{ marginTop: "8px", background: "#f7fbfa", padding: "8px", borderRadius: "6px", fontSize: "11px", color: "#577276", display: "grid", gap: "4px" }}>
                            {m.data.sources.map((src, sIdx) => (
                              <div key={sIdx}>✓ {src.title} (Sync: {src.lastUpdated})</div>
                            ))}
                            <div style={{ fontStyle: "italic", marginTop: "4px", color: "#91a2a4" }}>{m.data.uncertainty}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", background: "white", padding: "10px 14px", borderRadius: "12px", border: "1px solid #dce7e6", fontSize: "13px", color: "#71858a" }}>
                Checking live SHAASTRA database...
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: "8px 12px", background: "white", borderTop: "1px solid #eef4f3", display: "flex", gap: "6px", overflowX: "auto" }}>
            <button
              type="button"
              onClick={() => handleSend("Which shelter has the most available beds?")}
              style={{ padding: "6px 10px", borderRadius: "14px", border: "1px solid #dce7e6", background: "#f7fbfa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", color: "#087d7a", fontWeight: 600 }}
            >
              ⌂ Most available beds?
            </button>
            <button
              type="button"
              onClick={() => handleSend("There is flooding, what should I do?")}
              style={{ padding: "6px 10px", borderRadius: "14px", border: "1px solid #dce7e6", background: "#f7fbfa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", color: "#087d7a", fontWeight: 600 }}
            >
              🌊 Flooding safety guide
            </button>
            <button
              type="button"
              onClick={() => handleSend("Where can I get emergency help?")}
              style={{ padding: "6px 10px", borderRadius: "14px", border: "1px solid #dce7e6", background: "#f7fbfa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", color: "#087d7a", fontWeight: 600 }}
            >
              📞 Emergency hotlines
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", borderTop: "1px solid #dce7e6", padding: "10px", background: "white" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for shelter info or flood guidance..."
              style={{ flex: 1, border: 0, padding: "10px", fontSize: "13px", outline: "none" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#087d7a",
                color: "white",
                border: 0,
                borderRadius: "8px",
                padding: "8px 16px",
                font: "600 13px 'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
