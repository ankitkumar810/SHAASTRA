"use client";

import { FormEvent, useMemo, useState, useEffect, ChangeEvent } from "react";
import { demoPeople } from "@/lib/demo-data";
import type { SafeRecord } from "@/types/domain";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import type { AlertZoneMarker } from "@/components/ShelterMap";
import dynamic from "next/dynamic";
import Link from "next/link";

const ShelterMap = dynamic(() => import("@/components/ShelterMap").then((mod) => mod.ShelterMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", minHeight: "440px", background: "#E7F4F2", borderRadius: "12px", display: "grid", placeItems: "center", color: "#087D7A" }}>
      Loading OpenStreetMap...
    </div>
  ),
});

type View = "home" | "shelters" | "family" | "dashboard";
type FamilyTab = "safe" | "looking";

interface RealShelter {
  id: string;
  name: string;
  locality: string;
  address: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  foodStockStatus: string;
  medicineStockStatus: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

const sampleAlertZones: AlertZoneMarker[] = [
  {
    id: "alert-aluva-1",
    title: "Aluva Riverine Flood Warning",
    description: "Periyar river levels elevated near Aluva Bank Road. Move to higher ground shelters immediately.",
    severity: "CRITICAL",
    latitude: 10.1084,
    longitude: 76.357,
    areaName: "Aluva Locality",
    source: "NDMA / Ernakulam Control Room",
  },
];

const heroScenes = [
  {
    id: 1,
    title: "NDRF Flood Rescue & Evacuation",
    subtitle: "Rescue boats deployed in inundated flood zones",
    image: "/images/scene1-flood-rescue.jpg",
    badge: "FLOOD RESCUE",
  },
  {
    id: 2,
    title: "Evacuation & Relief Shelter",
    subtitle: "Safe registration & bed capacity tracking",
    image: "/images/scene2-shelter-evacuation.jpg",
    badge: "RELIEF SHELTER",
  },
  {
    id: 3,
    title: "Emergency Medical Response",
    subtitle: "108 Emergency medical triage & field care",
    image: "/images/scene3-emergency-response.jpg",
    badge: "MEDICAL AID",
  },
  {
    id: 4,
    title: "Response Command Center",
    subtitle: "Live situation overview & resource dispatch",
    image: "/images/scene4-command-coordination.jpg",
    badge: "COMMAND CENTER",
  },
];

export function PrototypeApp() {
  const { t, language } = useTranslation();
  const [view, setView] = useState<View>("home");
  const [familyTab, setFamilyTab] = useState<FamilyTab>("safe");
  const [query, setQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [people, setPeople] = useState<SafeRecord[]>(demoPeople);
  const [results, setResults] = useState<SafeRecord[] | null>(null);
  const [safeRegistrations, setSafeRegistrations] = useState(2187);
  const [userSafetyStatus, setUserSafetyStatus] = useState<"SAFE" | "PENDING" | "UNMARKED">("UNMARKED");
  const [toast, setToast] = useState("");
  const [realShelters, setRealShelters] = useState<RealShelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string | undefined>(undefined);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Camera verification state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Automatic cross-fade rotation between the 4 cropped hero scenes (every 3.5s)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSceneIndex((prevIndex) => (prevIndex + 1) % heroScenes.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Fetch real database shelters for landing page map & status
  useEffect(() => {
    async function fetchShelters() {
      try {
        const res = await fetch("/api/v1/shelters");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRealShelters(json.data);
        }
      } catch (err) {
        console.error("Error fetching landing page shelters:", err);
      }
    }
    fetchShelters();
  }, []);

  const visibleShelters = useMemo(() => {
    return realShelters.filter((shelter) => {
      const q = query.toLowerCase();
      const matchesSearch = `${shelter.name} ${shelter.locality} ${shelter.address}`.toLowerCase().includes(q);
      const matchesCapacity =
        capacityFilter === "all" ||
        (capacityFilter === "available" && shelter.status === "OPEN") ||
        (capacityFilter === "limited" && shelter.status === "LIMITED");
      return matchesSearch && matchesCapacity;
    });
  }, [capacityFilter, query, realShelters]);

  const totalAvailableBeds = useMemo(() => {
    return realShelters.reduce((acc, s) => acc + s.availableBeds, 0) || 254;
  }, [realShelters]);

  const activeSheltersCount = realShelters.length || 14;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  };

  const switchView = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Camera / File Selection Handler with validation
  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError(language === "hi" ? "कृपया एक वैध छवि (JPEG/PNG) चुनें।" : "Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(language === "hi" ? "फ़ाइल का आकार 5MB से कम होना चाहिए।" : "File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitSafeRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name"));
    const phone = String(form.get("phone"));
    const shelter = String(form.get("shelter"));
    const message = String(form.get("message") || "Marked safe via SHAASTRA.");

    const record: SafeRecord = {
      id: crypto.randomUUID(),
      name,
      phone,
      shelter,
      message,
      photoUrl: photoPreview || undefined,
      verificationStatus: photoPreview ? "PENDING_VERIFICATION" : "VERIFIED_SAFE",
      verifiedBy: photoPreview ? undefined : "Self-Registered Citizen",
      createdAt: new Date().toISOString(),
    };

    setPeople((current) => [record, ...current]);
    setSafeRegistrations((current) => current + 1);
    setUserSafetyStatus(photoPreview ? "PENDING" : "SAFE");
    event.currentTarget.reset();
    setPhotoPreview(null);

    showToast(
      photoPreview
        ? (language === "hi" ? "आपकी सुरक्षा स्थिति दर्ज हो गई है (सत्यापन का इंतजार)।" : "Safety status submitted (Pending Verification by Responder).")
        : (language === "hi" ? "आप सुरक्षित चिह्नित हैं।" : "You are marked safe. Your status can now be found by verified family searches.")
    );
  };

  const searchPeople = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchName = String(new FormData(event.currentTarget).get("name")).trim().toLowerCase();
    setResults(people.filter((person) => person.name.toLowerCase().includes(searchName)));
  };

  // Authority Verification Handlers
  const handleVerifyRecord = (recordId: string) => {
    setPeople((current) =>
      current.map((p) =>
        p.id === recordId
          ? { ...p, verificationStatus: "VERIFIED_SAFE", verifiedBy: "Authorized Responder" }
          : p
      )
    );
    showToast(language === "hi" ? "स्थिति सत्यापित सुरक्षित के रूप में अपडेट की गई।" : "Status updated to Verified Safe.");
  };

  const handleRejectRecord = (recordId: string) => {
    setPeople((current) =>
      current.map((p) =>
        p.id === recordId
          ? { ...p, verificationStatus: "REJECTED" }
          : p
      )
    );
    showToast(language === "hi" ? "सुरक्षा रिकॉर्ड अस्वीकृत कर दिया गया।" : "Registration rejected.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F5FAF9", color: "#17323B", width: "100%" }}>
      {/* Micro-interaction CSS injected inline with prefers-reduced-motion fallback */}
      <style jsx global>{`
        button, a, .elevated-card, .trans-card {
          transition: transform 0.18s ease-in-out, box-shadow 0.18s ease-in-out, background-color 0.18s ease-in-out, border-color 0.18s ease-in-out;
        }
        @media (prefers-reduced-motion: no-preference) {
          button:hover, a.cta-btn:hover, .elevated-card:hover, .trans-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(8,125,122,0.1);
          }
          button:hover .arrow-icon, a:hover .arrow-icon {
            transform: translateX(3px);
            display: inline-block;
            transition: transform 0.18s ease-in-out;
          }
        }
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
          outline: 3px solid #087D7A;
          outline-offset: 2px;
        }
        .leaflet-pane {
          z-index: 10 !important;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 20 !important;
        }
      `}</style>

      {/* Top Header Bar — Dark institutional authority contrast with sticky zIndex 1000 */}
      <header
        style={{
          background: "#17323B",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              switchView("home");
            }}
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", color: "white" }}
          >
            <span style={{ background: "#087D7A", color: "white", width: "36px", height: "36px", borderRadius: "8px", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: "18px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <span style={{ font: "700 20px Outfit" }}>{t("brandName")}</span>
          </a>

          <nav style={{ display: "flex", gap: "6px", overflowX: "auto", maxWidth: "100%" }}>
            <button
              onClick={() => switchView("home")}
              style={{
                minHeight: "44px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: 0,
                background: view === "home" ? "#087D7A" : "transparent",
                color: "white",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{t("overview")}</span>
            </button>
            <button
              onClick={() => switchView("shelters")}
              style={{
                minHeight: "44px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: 0,
                background: view === "shelters" ? "#087D7A" : "transparent",
                color: "white",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>{t("findShelter")}</span>
            </button>
            <button
              onClick={() => switchView("family")}
              style={{
                minHeight: "44px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: 0,
                background: view === "family" ? "#087D7A" : "transparent",
                color: "white",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>{t("familyReconnection")}</span>
            </button>
            <button
              onClick={() => switchView("dashboard")}
              style={{
                minHeight: "44px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: 0,
                background: view === "dashboard" ? "#087D7A" : "transparent",
                color: "white",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7 12 2"/></svg>
              <span>{t("districtCommand")}</span>
            </button>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginLeft: "auto" }}>
          <LanguageSelector />

          <Link
            href="/login"
            style={{
              minHeight: "44px",
              textDecoration: "none",
              font: "600 13px 'DM Sans', sans-serif",
              color: "#087D7A",
              background: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: "6px",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
            }}
          >
            {t("signIn")} / Portal
          </Link>

          <a
            href="tel:112"
            style={{
              minHeight: "44px",
              background: "#D94B3D",
              color: "white",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              font: "700 14px 'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(217,75,61,0.3)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>{t("call112")}</span>
          </a>
        </div>
      </header>

      {/* Main Document Content */}
      <main style={{ flex: 1, margin: "0 auto", width: "100%", maxWidth: "1280px", padding: "28px 24px" }}>
        {view === "home" && (
          <div>
            {/* Section 1: LIGHT & SOOTHING HERO with Rotating Disaster Response Scenes on RHS */}
            <section
              style={{
                background: "#E7F4F2",
                borderRadius: "16px",
                padding: "36px",
                color: "#17323B",
                marginBottom: "32px",
                boxShadow: "0 6px 24px rgba(8,125,122,0.06)",
                border: "1px solid #DCEAE8",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "center" }}>
                {/* Left Hero Block */}
                <div>
                  <span
                    style={{
                      background: "#D0EAE6",
                      color: "#087D7A",
                      border: "1px solid #B8DFD9",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "12px",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      display: "inline-block",
                      marginBottom: "16px",
                    }}
                  >
                    {t("tagline")}
                  </span>

                  <h1 style={{ font: "700 clamp(32px, 4vw, 44px) Outfit", margin: "0 0 16px", lineHeight: 1.15, color: "#17323B" }}>
                    {t("heroHeadline")}
                  </h1>

                  <p style={{ fontSize: "16px", color: "#3C5A63", margin: "0 0 28px", lineHeight: 1.55, maxWidth: "520px" }}>
                    {t("heroSubtext")}
                  </p>

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => switchView("shelters")}
                      style={{
                        minHeight: "48px",
                        background: "#087D7A",
                        color: "white",
                        border: 0,
                        borderRadius: "8px",
                        padding: "13px 22px",
                        font: "700 15px 'DM Sans', sans-serif",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(8,125,122,0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      <span>{t("findSafeShelter")}</span> <span className="arrow-icon">→</span>
                    </button>

                    <button
                      onClick={() => switchView("family")}
                      style={{
                        minHeight: "48px",
                        background: "#FFFFFF",
                        color: "#17323B",
                        border: "1px solid #DCEAE8",
                        borderRadius: "8px",
                        padding: "13px 22px",
                        font: "600 15px 'DM Sans', sans-serif",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#087D7A" strokeWidth="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <span>{t("imSafeFindSomeone")}</span> <span className="arrow-icon">→</span>
                    </button>

                    <a
                      href="tel:112"
                      style={{
                        minHeight: "48px",
                        background: "#D94B3D",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "8px",
                        padding: "13px 22px",
                        font: "700 15px 'DM Sans', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(217,75,61,0.25)",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span>{t("call112")}</span>
                    </a>
                  </div>
                </div>

                {/* Right Hero Block: Smooth Cross-Fade Rotating Disaster Response Scenes */}
                <div
                  style={{
                    position: "relative",
                    height: "360px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1px solid #DCEAE8",
                    boxShadow: "0 8px 24px rgba(8,125,122,0.08)",
                    background: "#FFFFFF",
                  }}
                >
                  {heroScenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: idx === activeSceneIndex ? 1 : 0,
                        transition: "opacity 0.8s ease-in-out",
                        pointerEvents: idx === activeSceneIndex ? "auto" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundImage: `url(${scene.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />

                      {/* Subtle Bottom Gradient Overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(23,50,59,0.88) 0%, rgba(23,50,59,0.2) 50%, rgba(0,0,0,0) 100%)",
                        }}
                      />

                      {/* Top Badge */}
                      <div style={{ position: "absolute", top: "14px", left: "14px", zIndex: 10 }}>
                        <span
                          style={{
                            background: "#087D7A",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            letterSpacing: "1px",
                          }}
                        >
                          {scene.badge}
                        </span>
                      </div>

                      {/* Bottom Title & Subtitle */}
                      <div style={{ position: "absolute", bottom: "16px", left: "16px", right: "70px", zIndex: 10, color: "white" }}>
                        <strong style={{ font: "700 16px Outfit", display: "block", color: "white" }}>{scene.title}</strong>
                        <span style={{ fontSize: "12px", color: "#E7F4F2" }}>{scene.subtitle}</span>
                      </div>
                    </div>
                  ))}

                  {/* Interactive Scene Indicator Dots at Bottom-Right */}
                  <div style={{ position: "absolute", bottom: "16px", right: "16px", zIndex: 20, display: "flex", gap: "6px" }}>
                    {heroScenes.map((scene, idx) => (
                      <button
                        key={scene.id}
                        onClick={() => setActiveSceneIndex(idx)}
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          border: "none",
                          padding: 0,
                          background: idx === activeSceneIndex ? "#087D7A" : "rgba(255,255,255,0.5)",
                          cursor: "pointer",
                          transition: "background-color 0.3s ease",
                        }}
                        aria-label={`Jump to scene ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Elevated Live Status Metric Cards */}
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "36px" }}>
              <div className="elevated-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#577276", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#087D7A" strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span>{t("activeShelters")}</span>
                </div>
                <strong style={{ font: "700 34px Outfit", display: "block", color: "#17323B", margin: "6px 0 2px" }}>{activeSheltersCount}</strong>
                <span style={{ fontSize: "12px", color: "#2E8B68", fontWeight: 600 }}>{t("acrossDistrict")}</span>
              </div>

              <div className="elevated-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#577276", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E8B68" strokeWidth="2.2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="6" cy="11" r="2"/></svg>
                  <span>{t("availableBeds")}</span>
                </div>
                <strong style={{ font: "700 34px Outfit", display: "block", color: "#2E8B68", margin: "6px 0 2px" }}>{totalAvailableBeds}</strong>
                <span style={{ fontSize: "12px", color: "#577276" }}>{t("liveBedCapacity")}</span>
              </div>

              <div className="elevated-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#577276", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#087D7A" strokeWidth="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span>{t("safeRegistrations")}</span>
                </div>
                <strong style={{ font: "700 34px Outfit", display: "block", color: "#17323B", margin: "6px 0 2px" }}>{safeRegistrations.toLocaleString()}</strong>
                <span style={{ fontSize: "12px", color: "#2E8B68", fontWeight: 600 }}>{t("peopleMarkedSafe")}</span>
              </div>

              <div className="elevated-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#577276", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E39A2B" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>{t("activeAlerts")}</span>
                </div>
                <strong style={{ font: "700 34px Outfit", display: "block", color: "#E39A2B", margin: "6px 0 2px" }}>3</strong>
                <span style={{ fontSize: "12px", color: "#E39A2B", fontWeight: 600 }}>{t("requiringAttention")}</span>
              </div>
            </section>

            {/* Section 3: EXACT Heading + 4 Rich Transformation Cards */}
            <section style={{ background: "#E7F4F2", border: "1px solid #DCEAE8", borderRadius: "18px", padding: "32px 28px", marginBottom: "36px" }}>
              <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 28px" }}>
                <span style={{ color: "#087D7A", font: "700 11px 'DM Sans'", letterSpacing: "1.8px", textTransform: "uppercase" }}>{t("workflowSubtitle")}</span>
                <h2 style={{ font: "700 28px Outfit", margin: "6px 0 0", color: "#17323B" }}>
                  {t("howTransformsHeading")}
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
                {/* Card 01: FIND SAFETY */}
                <div className="trans-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderTop: "4px solid #087D7A", borderRadius: "14px", padding: "24px", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <span style={{ position: "absolute", top: "18px", right: "20px", font: "700 20px Outfit", color: "#087D7A", opacity: 0.8 }}>01</span>
                  <div style={{ color: "#087D7A", marginBottom: "12px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <h3 style={{ font: "700 17px Outfit", margin: "0 0 8px", color: "#17323B" }}>{t("card1Title")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 18px", lineHeight: 1.45 }}>
                    {t("card1Desc")}
                  </p>
                  <button onClick={() => switchView("shelters")} style={{ color: "#087D7A", background: "transparent", border: 0, fontWeight: 700, fontSize: "13px", cursor: "pointer", padding: 0 }}>
                    {t("findShelter")} <span className="arrow-icon">→</span>
                  </button>
                </div>

                {/* Card 02: RECONNECT */}
                <div className="trans-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderTop: "4px solid #2E8B68", borderRadius: "14px", padding: "24px", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <span style={{ position: "absolute", top: "18px", right: "20px", font: "700 20px Outfit", color: "#2E8B68", opacity: 0.8 }}>02</span>
                  <div style={{ color: "#2E8B68", marginBottom: "12px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <h3 style={{ font: "700 17px Outfit", margin: "0 0 8px", color: "#17323B" }}>{t("card2Title")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 18px", lineHeight: 1.45 }}>
                    {t("card2Desc")}
                  </p>
                  <button onClick={() => switchView("family")} style={{ color: "#087D7A", background: "transparent", border: 0, fontWeight: 700, fontSize: "13px", cursor: "pointer", padding: 0 }}>
                    {t("familyReconnection")} <span className="arrow-icon">→</span>
                  </button>
                </div>

                {/* Card 03: COORDINATE */}
                <div className="trans-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderTop: "4px solid #17323B", borderRadius: "14px", padding: "24px", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <span style={{ position: "absolute", top: "18px", right: "20px", font: "700 20px Outfit", color: "#17323B", opacity: 0.8 }}>03</span>
                  <div style={{ color: "#17323B", marginBottom: "12px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7 12 2"/></svg>
                  </div>
                  <h3 style={{ font: "700 17px Outfit", margin: "0 0 8px", color: "#17323B" }}>{t("card3Title")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 18px", lineHeight: 1.45 }}>
                    {t("card3Desc")}
                  </p>
                  <button onClick={() => switchView("dashboard")} style={{ color: "#087D7A", background: "transparent", border: 0, fontWeight: 700, fontSize: "13px", cursor: "pointer", padding: 0 }}>
                    {t("districtCommand")} <span className="arrow-icon">→</span>
                  </button>
                </div>

                {/* Card 04: STAY CONNECTED */}
                <div className="trans-card" style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderTop: "4px solid #E39A2B", borderRadius: "14px", padding: "24px", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <span style={{ position: "absolute", top: "18px", right: "20px", font: "700 20px Outfit", color: "#E39A2B", opacity: 0.8 }}>04</span>
                  <div style={{ color: "#E39A2B", marginBottom: "12px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/><circle cx="12" cy="12" r="2"/><path d="M12 14v8"/></svg>
                  </div>
                  <h3 style={{ font: "700 17px Outfit", margin: "0 0 8px", color: "#17323B" }}>{t("card4Title")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 18px", lineHeight: 1.45 }}>
                    {t("card4Desc")}
                  </p>
                  <a href="tel:112" style={{ color: "#087D7A", textDecoration: "none", fontWeight: 700, fontSize: "13px" }}>
                    {t("call112")}
                  </a>
                </div>
              </div>
            </section>

            {/* Section 4: LARGE LIVE MAP ON RHS ("See the response network in action") - LIGHT THEME CONTAINER */}
            <section style={{ background: "#E7F4F2", border: "1px solid #DCEAE8", borderRadius: "18px", padding: "32px 28px", color: "#17323B", marginBottom: "36px", boxShadow: "0 6px 24px rgba(8,125,122,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", alignItems: "center" }}>
                {/* Left Column: Operational Summary & Live Numbers */}
                <div style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <span style={{ color: "#087D7A", font: "700 11px 'DM Sans'", letterSpacing: "1.5px", textTransform: "uppercase" }}>● SPATIAL OPERATIONAL COMMAND</span>
                    <h2 style={{ font: "700 28px Outfit", margin: "6px 0 8px", color: "#17323B" }}>
                      {t("spatialHeading")}
                    </h2>
                    <p style={{ fontSize: "14px", color: "#3C5A63", margin: 0, lineHeight: 1.5 }}>
                      {t("spatialSubtext")}
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "14px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", color: "#577276", fontWeight: 700, display: "block" }}>{t("activeShelters")}</span>
                      <strong style={{ font: "700 24px Outfit", color: "#17323B" }}>{activeSheltersCount} Online</strong>
                    </div>
                    <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "14px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", color: "#577276", fontWeight: 700, display: "block" }}>{t("availableBeds")}</span>
                      <strong style={{ font: "700 24px Outfit", color: "#2E8B68" }}>{totalAvailableBeds} Free</strong>
                    </div>
                    <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "14px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", color: "#577276", fontWeight: 700, display: "block" }}>{t("safeRegistrations")}</span>
                      <strong style={{ font: "700 24px Outfit", color: "#17323B" }}>{safeRegistrations.toLocaleString()}</strong>
                    </div>
                    <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "14px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", color: "#577276", fontWeight: 700, display: "block" }}>{t("activeAlerts")}</span>
                      <strong style={{ font: "700 24px Outfit", color: "#E39A2B" }}>3 Active</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => switchView("shelters")}
                    style={{ minHeight: "48px", background: "#087D7A", color: "white", border: 0, borderRadius: "8px", padding: "14px 20px", fontWeight: 700, fontSize: "14px", cursor: "pointer", width: "100%", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 14px rgba(8,125,122,0.25)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{t("exploreLiveMap")}</span> <span className="arrow-icon">→</span>
                  </button>
                </div>

                {/* Right Column: LARGE BEAUTIFULLY PRESENTED LIVE MAP with position relative & scoped zIndex */}
                <div style={{ zIndex: 1, height: "460px", borderRadius: "14px", overflow: "hidden", border: "1px solid #DCEAE8", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                  <ShelterMap shelters={realShelters} alerts={sampleAlertZones} selectedShelterId={selectedShelterId} onSelectShelter={setSelectedShelterId} />
                </div>
              </div>
            </section>

            {/* Section 5: SACHET Emergency Alert Preview */}
            <section style={{ marginBottom: "36px" }}>
              <div style={{ background: "#FFF2F0", border: "1px solid #F8B4AB", borderLeft: "6px solid #D94B3D", borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ background: "#D94B3D", color: "white", fontSize: "10px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", letterSpacing: "1px" }}>
                    🔴 {t("criticalAlertPreview")}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#D94B3D" }}>📍 {t("alertLocation")}</span>
                  <span style={{ fontSize: "11px", color: "#71858A" }}>{t("alertSource")}</span>
                </div>
                <h3 style={{ font: "700 18px Outfit", margin: "0 0 6px", color: "#17323B" }}>{t("alertTitle")}</h3>
                <p style={{ fontSize: "13px", color: "#17323B", margin: "0 0 14px", lineHeight: 1.4 }}>
                  {t("alertDescription")}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderTop: "1px solid #F8B4AB", paddingTop: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#71858A" }}>{t("alertIssued")}</span>
                  <a href="tel:112" style={{ background: "#D94B3D", color: "white", textDecoration: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>{t("call112")}</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Section 6: Problem ➔ Solution ➔ Impact Flow */}
            <section style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderRadius: "16px", padding: "28px", marginBottom: "36px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <h2 style={{ font: "700 22px Outfit", margin: "0 0 20px", color: "#17323B", textAlign: "center" }}>
                {t("problemSolutionImpact")}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
                <div style={{ borderLeft: "4px solid #E39A2B", paddingLeft: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#E39A2B", letterSpacing: "1px" }}>1. THE PROBLEM</span>
                  <h3 style={{ font: "700 17px Outfit", margin: "4px 0 4px", color: "#17323B" }}>{t("probTitle")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: 0, lineHeight: 1.5 }}>
                    {t("probDesc")}
                  </p>
                </div>

                <div style={{ borderLeft: "4px solid #087D7A", paddingLeft: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#087D7A", letterSpacing: "1px" }}>2. THE SOLUTION</span>
                  <h3 style={{ font: "700 17px Outfit", margin: "4px 0 4px", color: "#17323B" }}>{t("solTitle")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: 0, lineHeight: 1.5 }}>
                    {t("solDesc")}
                  </p>
                </div>

                <div style={{ borderLeft: "4px solid #2E8B68", paddingLeft: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#2E8B68", letterSpacing: "1px" }}>3. THE IMPACT</span>
                  <h3 style={{ font: "700 17px Outfit", margin: "4px 0 4px", color: "#17323B" }}>{t("impTitle")}</h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: 0, lineHeight: 1.5 }}>
                    {t("impDesc")}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7: Bottom Low-Bandwidth Resilience Features Bar */}
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", textAlign: "center" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "16px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ color: "#087D7A", marginBottom: "6px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/><circle cx="12" cy="12" r="2"/><path d="M12 14v8"/></svg>
                </div>
                <strong>{t("worksOffline")}</strong>
                <span style={{ display: "block", fontSize: "11px", color: "#577276", marginTop: "2px" }}>{t("worksOfflineSub")}</span>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "16px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ color: "#087D7A", marginBottom: "6px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <strong>{t("smsAlerts")}</strong>
                <span style={{ display: "block", fontSize: "11px", color: "#577276", marginTop: "2px" }}>{t("smsAlertsSub")}</span>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "16px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ color: "#087D7A", marginBottom: "6px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                </div>
                <strong>{t("aiHelper")}</strong>
                <span style={{ display: "block", fontSize: "11px", color: "#577276", marginTop: "2px" }}>{t("aiHelperSub")}</span>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "16px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ color: "#087D7A", marginBottom: "6px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <strong>{t("safePrivate")}</strong>
                <span style={{ display: "block", fontSize: "11px", color: "#577276", marginTop: "2px" }}>{t("safePrivateSub")}</span>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", padding: "16px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ color: "#087D7A", marginBottom: "6px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7 12 2"/></svg>
                </div>
                <strong>{t("govReady")}</strong>
                <span style={{ display: "block", fontSize: "11px", color: "#577276", marginTop: "2px" }}>{t("govReadySub")}</span>
              </div>
            </section>
          </div>
        )}

        {/* Shelters View - Accessible List + Map Split View */}
        {view === "shelters" && (
          <section id="shelters">
            <div style={{ marginBottom: "24px" }}>
              <p style={{ color: "#087D7A", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px", textTransform: "uppercase" }}>{t("shelterDiscovery")}</p>
              <h1 style={{ font: "700 32px Outfit", margin: 0, color: "#17323B" }}>{t("findShelterHeading")}</h1>
              <p style={{ color: "#577276", fontSize: "15px", margin: "6px 0 0" }}>{t("findShelterSub")}</p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchShelters")}
                style={{ minHeight: "44px", flex: "1 1 280px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #DCEAE8", fontSize: "14px" }}
              />
              <select value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)} style={{ minHeight: "44px", padding: "10px", borderRadius: "8px", border: "1px solid #DCEAE8", background: "white", fontSize: "13px" }}>
                <option value="all">{t("allStatuses")}</option>
                <option value="available">Beds Available</option>
                <option value="limited">Limited Space</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {/* Accessible List Card Alternative */}
              <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
                {visibleShelters.map((shelter) => (
                  <div
                    key={shelter.id}
                    onClick={() => setSelectedShelterId(shelter.id)}
                    className="elevated-card"
                    style={{
                      background: "white",
                      border: selectedShelterId === shelter.id ? "2px solid #087D7A" : "1px solid #DCEAE8",
                      borderRadius: "12px",
                      padding: "20px",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span style={{ float: "right", fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "10px", color: shelter.status === "OPEN" ? "#2E8B68" : "#E39A2B", background: shelter.status === "OPEN" ? "#E2F6ED" : "#FFF1D9" }}>
                      {shelter.status}
                    </span>
                    <h3 style={{ font: "700 18px Outfit", margin: "0 0 4px", color: "#17323B", display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#087D7A" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      <span>{shelter.name}</span>
                    </h3>
                    <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>{shelter.locality}</span>
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px", background: "#F5FAF9", padding: "10px", borderRadius: "8px", fontSize: "12px", margin: "8px 0 14px" }}>
                      <div><strong>{shelter.availableBeds} beds free</strong></div>
                      <div>{t("foodStock")}: <strong>{shelter.foodStockStatus}</strong></div>
                      <div>{t("medStock")}: <strong>{shelter.medicineStockStatus}</strong></div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <Link href={`/dashboard/citizen/shelters/${shelter.id}`} style={{ minHeight: "44px", background: "#087D7A", color: "white", textDecoration: "none", padding: "10px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, display: "inline-flex", alignItems: "center" }}>
                        {t("viewDetails")}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ zIndex: 1, height: "550px", position: "sticky", top: "20px" }}>
                <ShelterMap shelters={visibleShelters} alerts={sampleAlertZones} selectedShelterId={selectedShelterId} onSelectShelter={setSelectedShelterId} />
              </div>
            </div>
          </section>
        )}

        {/* Family Reconnect View - 2 Column Layout with RHS Family Safety Network Panel + Camera Verification */}
        {view === "family" && (
          <section id="family">
            <div style={{ marginBottom: "24px" }}>
              <p style={{ color: "#087D7A", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px", textTransform: "uppercase" }}>{t("familyReconnection")}</p>
              <h1 style={{ font: "700 32px Outfit", margin: 0, color: "#17323B" }}>{t("familyHeadline")}</h1>
              <p style={{ color: "#577276", fontSize: "15px", margin: "6px 0 0" }}>{t("familySubtext")}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
              {/* Left Column: Form & Search Tabs */}
              <div>
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                  <button onClick={() => setFamilyTab("safe")} style={{ minHeight: "44px", padding: "10px 20px", borderRadius: "8px", border: 0, background: familyTab === "safe" ? "#087D7A" : "white", color: familyTab === "safe" ? "white" : "#17323B", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>{t("imSafeTab")}</span>
                  </button>
                  <button onClick={() => setFamilyTab("looking")} style={{ minHeight: "44px", padding: "10px 20px", borderRadius: "8px", border: 0, background: familyTab === "looking" ? "#087D7A" : "white", color: familyTab === "looking" ? "white" : "#17323B", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>{t("lookingTab")}</span>
                  </button>
                </div>

                {familyTab === "safe" ? (
                  <form onSubmit={submitSafeRecord} style={{ background: "white", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "24px", display: "grid", gap: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                    <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                      {t("fullName")}
                      <input required name="name" placeholder="e.g. Ananya Nair" style={{ minHeight: "44px", padding: "10px", borderRadius: "6px", border: "1px solid #DCEAE8" }} />
                    </label>
                    <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                      {t("mobilePhone")}
                      <input required name="phone" inputMode="tel" placeholder="10-digit number" style={{ minHeight: "44px", padding: "10px", borderRadius: "6px", border: "1px solid #DCEAE8" }} />
                    </label>
                    <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                      {t("currentShelter")}
                      <select name="shelter" style={{ minHeight: "44px", padding: "10px", borderRadius: "6px", border: "1px solid #DCEAE8", background: "white" }}>
                        <option>St. Teresa&apos;s Relief Centre</option>
                        <option>Kalamassery Community Hall</option>
                        <option>Aluva Town Hall</option>
                        <option>Not at a shelter</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                      {t("familyMessage")}
                      <input name="message" placeholder="e.g. I am safe at the relief shelter." style={{ minHeight: "44px", padding: "10px", borderRadius: "6px", border: "1px solid #DCEAE8" }} />
                    </label>

                    {/* Camera / Photo Capture Step */}
                    <div style={{ display: "grid", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{t("optionalPhotoLabel")}</span>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <label
                          style={{
                            minHeight: "44px",
                            background: "#F5FAF9",
                            border: "1px solid #087D7A",
                            color: "#087D7A",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          <span>📷 {t("takePhoto")}</span>
                          <input type="file" accept="image/*" capture="user" onChange={handlePhotoSelect} style={{ display: "none" }} />
                        </label>

                        <label
                          style={{
                            minHeight: "44px",
                            background: "#F5FAF9",
                            border: "1px solid #DCEAE8",
                            color: "#17323B",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <span>↑ {t("uploadPhoto")}</span>
                          <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
                        </label>
                      </div>

                      {photoError && <span style={{ color: "#D94B3D", fontSize: "12px" }}>{photoError}</span>}

                      {photoPreview && (
                        <div style={{ position: "relative", width: "110px", height: "110px", marginTop: "6px", borderRadius: "8px", overflow: "hidden", border: "2px solid #087D7A" }}>
                          <img src={photoPreview} alt="Verification Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button
                            type="button"
                            onClick={() => setPhotoPreview(null)}
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              background: "rgba(217,75,61,0.9)",
                              color: "white",
                              border: 0,
                              borderRadius: "50%",
                              width: "22px",
                              height: "22px",
                              cursor: "pointer",
                              fontSize: "11px",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <button type="submit" style={{ minHeight: "48px", background: "#087D7A", color: "white", border: 0, borderRadius: "8px", padding: "12px", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <span>{t("markMeSafeBtn")}</span> <span className="arrow-icon">→</span>
                    </button>
                  </form>
                ) : (
                  <div style={{ background: "white", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                    <form onSubmit={searchPeople} style={{ display: "grid", gap: "16px", marginBottom: "20px" }}>
                      <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                        {t("missingName")}
                        <input required name="name" placeholder="Enter full or first name" style={{ minHeight: "44px", padding: "10px", borderRadius: "6px", border: "1px solid #DCEAE8" }} />
                      </label>
                      <button type="submit" style={{ minHeight: "48px", background: "#087D7A", color: "white", border: 0, borderRadius: "8px", padding: "12px", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <span>{t("searchRegistryBtn")}</span>
                      </button>
                    </form>

                    {results !== null && (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {results.length > 0 ? (
                          results.map((person) => (
                            <div key={person.id} style={{ background: "#E2F6ED", border: "1px solid #C4EBE3", borderRadius: "8px", padding: "14px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                                <div>
                                  <strong style={{ font: "700 16px Outfit", color: "#2E8B68" }}>{person.name}</strong>
                                  <p style={{ fontSize: "13px", margin: "4px 0 0", color: "#17323B" }}>{t("verifiedSafeAt")} {person.shelter}</p>
                                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: person.verificationStatus === "VERIFIED_SAFE" ? "#C4EBE3" : "#FFF1D9", color: person.verificationStatus === "VERIFIED_SAFE" ? "#2E8B68" : "#E39A2B", display: "inline-block", marginTop: "6px" }}>
                                    {person.verificationStatus === "VERIFIED_SAFE" ? `✓ ${t("verifiedSafeLabel")} — ${person.verifiedBy || t("verifiedByResponder")}` : `⏳ ${t("possibleMatchMsg")}`}
                                  </span>
                                </div>
                                {person.photoUrl && (
                                  <img src={person.photoUrl} alt="Protected Thumbnail" style={{ width: "50px", height: "50px", borderRadius: "6px", objectFit: "cover", border: "1px solid #2E8B68" }} />
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: "13px", color: "#577276" }}>{t("noRecordFound")}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Useful "Family Safety Network" Informational Panel */}
              <div style={{ display: "grid", gap: "20px", alignContent: "start" }}>
                {/* User Status Card */}
                <div style={{ background: "white", border: "1px solid #DCEAE8", borderRadius: "12px", padding: "22px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#577276", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>{t("userSafetyStatusTitle")}</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ font: "700 20px Outfit", color: userSafetyStatus === "SAFE" ? "#2E8B68" : userSafetyStatus === "PENDING" ? "#E39A2B" : "#17323B" }}>
                        {userSafetyStatus === "SAFE" ? `✓ ${t("safeStatus")}` : userSafetyStatus === "PENDING" ? `⏳ ${t("pendingStatus")}` : t("notYetMarkedSafe")}
                      </strong>
                      <p style={{ fontSize: "12px", color: "#577276", margin: "2px 0 0" }}>
                        {userSafetyStatus === "SAFE" ? "Listed in verified family registry" : userSafetyStatus === "PENDING" ? "Pending verification by responder" : "Register to let family know you are okay"}
                      </p>
                    </div>

                    {userSafetyStatus !== "SAFE" && (
                      <button
                        onClick={() => setFamilyTab("safe")}
                        style={{ minHeight: "44px", background: "#087D7A", color: "white", border: 0, borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                      >
                        {t("markMeSafeBtn")} →
                      </button>
                    )}
                  </div>
                </div>

                {/* Authority Safety Verification Review Queue */}
                <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderTop: "4px solid #E39A2B", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <h3 style={{ font: "700 16px Outfit", margin: "0 0 4px", color: "#17323B", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E39A2B" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>{t("authorityVerificationTitle")}</span>
                  </h3>
                  <p style={{ fontSize: "12px", color: "#577276", margin: "0 0 14px" }}>{t("authorityVerificationSub")}</p>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {people.filter((p) => p.photoUrl || p.verificationStatus === "PENDING_VERIFICATION").map((record) => (
                      <div key={record.id} style={{ background: "#F5FAF9", border: "1px solid #DCEAE8", borderRadius: "8px", padding: "12px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        {record.photoUrl && (
                          <img src={record.photoUrl} alt="Submission Preview" style={{ width: "50px", height: "50px", borderRadius: "6px", objectFit: "cover", border: "1px solid #087D7A" }} />
                        )}
                        <div style={{ flex: 1, minWidth: "160px" }}>
                          <strong style={{ fontSize: "14px", color: "#17323B" }}>{record.name}</strong>
                          <span style={{ display: "block", fontSize: "11px", color: "#577276" }}>📍 {record.shelter}</span>
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: record.verificationStatus === "VERIFIED_SAFE" ? "#E2F6ED" : "#FFF1D9", color: record.verificationStatus === "VERIFIED_SAFE" ? "#2E8B68" : "#E39A2B", display: "inline-block", marginTop: "4px" }}>
                            {record.verificationStatus === "VERIFIED_SAFE" ? `✓ ${t("verifiedSafeLabel")}` : `⏳ ${t("pendingVerificationLabel")}`}
                          </span>
                        </div>

                        {record.verificationStatus === "PENDING_VERIFICATION" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleVerifyRecord(record.id)}
                              style={{ minHeight: "36px", background: "#2E8B68", color: "white", border: 0, borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                              ✓ {t("verifyActionBtn")}
                            </button>
                            <button
                              onClick={() => handleRejectRecord(record.id)}
                              style={{ minHeight: "36px", background: "#D94B3D", color: "white", border: 0, borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                              ✕ {t("rejectActionBtn")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Family Safety Network Panel */}
                <div style={{ background: "#FFFFFF", border: "1px solid #DCEAE8", borderTop: "4px solid #087D7A", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                  <h3 style={{ font: "700 18px Outfit", margin: "0 0 6px", color: "#17323B", display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#087D7A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>{t("familyNetworkTitle")}</span>
                  </h3>
                  <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 20px" }}>{t("familyNetworkSub")}</p>

                  {/* Lightweight Connection Flow Diagram */}
                  <div style={{ background: "#F5FAF9", border: "1px solid #E6EEEE", borderRadius: "10px", padding: "16px", textAlign: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", fontSize: "12px", fontWeight: 700, color: "#17323B" }}>
                      <div style={{ background: "#E9F7F4", padding: "8px 12px", borderRadius: "8px", border: "1px solid #C4EBE3" }}>
                        <span>YOU</span>
                      </div>
                      <span style={{ color: "#087D7A", fontWeight: "bold" }}>➔</span>
                      <div style={{ background: "#E2F6ED", color: "#2E8B68", padding: "8px 12px", borderRadius: "8px", border: "1px solid #C4EBE3" }}>
                        <span>✓ SAFE</span>
                      </div>
                      <span style={{ color: "#087D7A", fontWeight: "bold" }}>➔</span>
                      <div style={{ background: "#E9F7F4", padding: "8px 12px", borderRadius: "8px", border: "1px solid #C4EBE3" }}>
                        <span>FAMILY</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "12px", fontSize: "13px", color: "#17323B", lineHeight: 1.4 }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ color: "#2E8B68", fontWeight: "bold" }}>✓</span>
                      <span><strong>{t("markMeSafeBtn")}:</strong> Updates verified registry accessible by family.</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ color: "#2E8B68", fontWeight: "bold" }}>✓</span>
                      <span><strong>Search loved ones:</strong> Search verified shelter lists by name.</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ color: "#2E8B68", fontWeight: "bold" }}>✓</span>
                      <span><strong>{t("safePrivate")}:</strong> {t("photoSecurityNotice")}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ color: "#2E8B68", fontWeight: "bold" }}>✓</span>
                      <span><strong>Works Offline & SMS:</strong> Syncs status via Twilio SMS without internet.</span>
                    </div>
                  </div>

                  <p style={{ fontStyle: "italic", fontSize: "12px", color: "#577276", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #F0F6F5" }}>
                    &ldquo;{t("quoteText")}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dashboard View */}
        {view === "dashboard" && (
          <section id="dashboard">
            <div style={{ marginBottom: "24px" }}>
              <p style={{ color: "#087D7A", font: "700 11px 'DM Sans'", letterSpacing: "1.7px", margin: "0 0 6px", textTransform: "uppercase" }}>{t("districtCommand")}</p>
              <h1 style={{ font: "700 32px Outfit", margin: 0, color: "#17323B" }}>Operational Overview: Ernakulam</h1>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div style={{ background: "white", border: "1px solid #DCEAE8", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <span style={{ color: "#577276", fontSize: "12px", fontWeight: 700 }}>ACTIVE SHELTERS</span>
                <strong style={{ font: "700 32px Outfit", display: "block", color: "#17323B" }}>{activeSheltersCount}</strong>
              </div>
              <div style={{ background: "white", border: "1px solid #DCEAE8", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <span style={{ color: "#577276", fontSize: "12px", fontWeight: 700 }}>AVAILABLE BEDS</span>
                <strong style={{ font: "700 32px Outfit", display: "block", color: "#2E8B68" }}>{totalAvailableBeds}</strong>
              </div>
              <div style={{ background: "white", border: "1px solid #DCEAE8", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                <span style={{ color: "#577276", fontSize: "12px", fontWeight: 700 }}>SAFE REGISTRATIONS</span>
                <strong style={{ font: "700 32px Outfit", display: "block", color: "#17323B" }}>{safeRegistrations.toLocaleString()}</strong>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Toast Notification */}
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
