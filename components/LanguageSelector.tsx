"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation, Language } from "@/lib/i18n";

export function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        style={{
          background: "transparent",
          border: "1px solid #dce7e6",
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "15px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          color: "#17323b",
        }}
      >
        <span>🌐</span>
        <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{language}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            background: "white",
            border: "1px solid #dce7e6",
            borderRadius: "8px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
            zIndex: 50,
            minWidth: "120px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => handleSelect("en")}
            style={{
              width: "100%",
              padding: "9px 14px",
              textAlign: "left",
              border: 0,
              background: language === "en" ? "#e9f7f4" : "transparent",
              color: language === "en" ? "#087d7a" : "#17323b",
              fontWeight: language === "en" ? 700 : 400,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleSelect("hi")}
            style={{
              width: "100%",
              padding: "9px 14px",
              textAlign: "left",
              border: 0,
              background: language === "hi" ? "#e9f7f4" : "transparent",
              color: language === "hi" ? "#087d7a" : "#17323b",
              fontWeight: language === "hi" ? 700 : 400,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      )}
    </div>
  );
}
