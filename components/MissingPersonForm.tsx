"use client";

import { useState, ChangeEvent, FormEvent } from "react";

interface MissingPersonFormProps {
  onSuccess?: () => void;
}

export function MissingPersonForm({ onSuccess }: MissingPersonFormProps) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [lastSeenAt, setLastSeenAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string; name: string } | null>(null);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Photo size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPhotoUrl(result);
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !contactName.trim() || !contactPhone.trim()) {
      setErrorMessage("Please complete all required fields: Missing Person Name, Your Name, and Phone.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        description: description.trim() || null,
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
        locationName: locationName.trim() || null,
        photoUrl: photoUrl || null,
      };

      const res = await fetch("/api/v1/missing-persons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit report. Please try again.");
      }

      setSuccessData(data.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Missing person submit error:", err);
      setErrorMessage(err.message || "An unexpected error occurred. Please check your network and retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setContactName("");
    setContactPhone("");
    setLastSeenAt("");
    setLocationName("");
    setDescription("");
    setPhotoUrl(null);
    setPhotoPreview(null);
    setSuccessData(null);
    setErrorMessage(null);
  };

  if (successData) {
    return (
      <div
        style={{
          background: "#edf7f5",
          border: "1px solid #bce2dc",
          borderRadius: "12px",
          padding: "32px 24px",
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
        <h3
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: "24px",
            color: "#087d7a",
            margin: "0 0 8px",
          }}
        >
          Report Filed Successfully
        </h3>
        <p style={{ color: "#2c5450", fontSize: "15px", margin: "0 0 16px", lineHeight: 1.5 }}>
          Missing person report for <strong>{successData.name}</strong> (ID: {successData.id.slice(-6).toUpperCase()}) has been broadcast to district emergency response personnel and added to the official registry.
        </p>
        <p style={{ fontSize: "13px", color: "#577276", margin: "0 0 24px" }}>
          Relief teams will verify reports against active shelter rosters and medical triage centers.
        </p>
        <button
          onClick={handleReset}
          style={{
            minHeight: "52px",
            padding: "0 28px",
            background: "#087d7a",
            color: "white",
            border: "none",
            borderRadius: "8px",
            font: "700 15px Outfit, sans-serif",
            cursor: "pointer",
          }}
        >
          + Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {errorMessage && (
        <div
          style={{
            background: "#fee8e4",
            border: "1px solid #f8cdcd",
            borderRadius: "8px",
            padding: "14px 18px",
            color: "#b64b3d",
            fontSize: "14px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        {/* Missing Person Name */}
        <div>
          <label
            htmlFor="mp-name"
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "15px",
              color: "#17323b",
              marginBottom: "8px",
            }}
          >
            Name of Missing Person <span style={{ color: "#D94B3D" }}>*</span>
          </label>
          <input
            id="mp-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name as commonly known"
            style={{
              width: "100%",
              minHeight: "52px",
              padding: "12px 16px",
              fontSize: "16px",
              fontFamily: "'DM Sans', sans-serif",
              border: "1px solid #dce7e6",
              borderRadius: "8px",
              boxSizing: "border-box",
              outline: "none",
              color: "#17323b",
              background: "#ffffff",
            }}
          />
        </div>

        {/* Date / Time & Location Name Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Last seen datetime */}
          <div>
            <label
              htmlFor="mp-datetime"
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "15px",
                color: "#17323b",
                marginBottom: "8px",
              }}
            >
              Last Seen Date & Time
            </label>
            <input
              id="mp-datetime"
              type="datetime-local"
              value={lastSeenAt}
              onChange={(e) => setLastSeenAt(e.target.value)}
              style={{
                width: "100%",
                minHeight: "52px",
                padding: "12px 16px",
                fontSize: "16px",
                fontFamily: "'DM Sans', sans-serif",
                border: "1px solid #dce7e6",
                borderRadius: "8px",
                boxSizing: "border-box",
                outline: "none",
                color: "#17323b",
                background: "#ffffff",
              }}
            />
          </div>

          {/* Location Name / Description */}
          <div>
            <label
              htmlFor="mp-location"
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "15px",
                color: "#17323b",
                marginBottom: "8px",
              }}
            >
              Last Seen Location / Landmark
            </label>
            <input
              id="mp-location"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Near Aluva Railway Station, Camp 3"
              style={{
                width: "100%",
                minHeight: "52px",
                padding: "12px 16px",
                fontSize: "16px",
                fontFamily: "'DM Sans', sans-serif",
                border: "1px solid #dce7e6",
                borderRadius: "8px",
                boxSizing: "border-box",
                outline: "none",
                color: "#17323b",
                background: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Reporter Contact Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Your Name */}
          <div>
            <label
              htmlFor="mp-contact-name"
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "15px",
                color: "#17323b",
                marginBottom: "8px",
              }}
            >
              Your Name (Contact) <span style={{ color: "#D94B3D" }}>*</span>
            </label>
            <input
              id="mp-contact-name"
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your full name or relationship"
              style={{
                width: "100%",
                minHeight: "52px",
                padding: "12px 16px",
                fontSize: "16px",
                fontFamily: "'DM Sans', sans-serif",
                border: "1px solid #dce7e6",
                borderRadius: "8px",
                boxSizing: "border-box",
                outline: "none",
                color: "#17323b",
                background: "#ffffff",
              }}
            />
          </div>

          {/* Your Phone */}
          <div>
            <label
              htmlFor="mp-contact-phone"
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "15px",
                color: "#17323b",
                marginBottom: "8px",
              }}
            >
              Your Phone Number <span style={{ color: "#D94B3D" }}>*</span>
            </label>
            <input
              id="mp-contact-phone"
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              style={{
                width: "100%",
                minHeight: "52px",
                padding: "12px 16px",
                fontSize: "16px",
                fontFamily: "'DM Sans', sans-serif",
                border: "1px solid #dce7e6",
                borderRadius: "8px",
                boxSizing: "border-box",
                outline: "none",
                color: "#17323b",
                background: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Physical Description */}
        <div>
          <label
            htmlFor="mp-description"
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "15px",
              color: "#17323b",
              marginBottom: "8px",
            }}
          >
            Physical Description / Identifying Details (Optional)
          </label>
          <textarea
            id="mp-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Age, clothing worn when last seen, height, identifying marks, medical needs..."
            style={{
              width: "100%",
              minHeight: "84px",
              padding: "12px 16px",
              fontSize: "16px",
              fontFamily: "'DM Sans', sans-serif",
              border: "1px solid #dce7e6",
              borderRadius: "8px",
              boxSizing: "border-box",
              outline: "none",
              color: "#17323b",
              background: "#ffffff",
              resize: "vertical",
            }}
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label
            htmlFor="mp-photo"
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "15px",
              color: "#17323b",
              marginBottom: "8px",
            }}
          >
            Recent Photo (Optional)
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <label
              htmlFor="mp-photo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                minHeight: "52px",
                padding: "0 20px",
                border: "1px dashed #087d7a",
                borderRadius: "8px",
                background: "#f7fbfa",
                color: "#087d7a",
                fontWeight: 600,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              <span>📷</span> Choose Image File
            </label>
            <input
              id="mp-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
            {photoPreview && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: "48px",
                    height: "48px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid #dce7e6",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setPhotoPreview(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#D94B3D",
                    fontSize: "13px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: "8px" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              minHeight: "54px",
              fontSize: "16px",
              fontWeight: 700,
              fontFamily: "Outfit, sans-serif",
              background: isSubmitting ? "#83aba8" : "#087d7a",
              color: "white",
              borderRadius: "10px",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(8, 125, 122, 0.2)",
              transition: "background 0.15s ease",
            }}
          >
            {isSubmitting ? (
              <span>Submitting Report…</span>
            ) : (
              <span>Submit Missing Person Report</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default MissingPersonForm;
