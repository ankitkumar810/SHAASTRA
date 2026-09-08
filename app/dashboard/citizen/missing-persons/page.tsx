import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MissingPersonForm } from "@/components/MissingPersonForm";

export const dynamic = "force-dynamic";

interface MissingPersonItem {
  id: string;
  name: string;
  status: "MISSING" | "LOCATED" | "SAFE" | "REUNITED" | string;
  locationName?: string | null;
  contactName: string;
  contactPhone?: string | null;
  photoUrl?: string | null;
  description?: string | null;
  lastSeenAt?: string | Date | null;
  createdAt?: string | Date;
  district?: { name: string } | null;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; label: string; icon: string }
> = {
  MISSING: {
    bg: "#fee8e4",
    color: "#D94B3D",
    border: "#f8cdcd",
    label: "MISSING",
    icon: "🚨",
  },
  LOCATED: {
    bg: "#fff4e5",
    color: "#E39A2B",
    border: "#fbd38d",
    label: "LOCATED",
    icon: "🔍",
  },
  SAFE: {
    bg: "#e6f6f5",
    color: "#087D7A",
    border: "#b2e3df",
    label: "SAFE",
    icon: "🛡️",
  },
  REUNITED: {
    bg: "#e6f8ef",
    color: "#149166",
    border: "#a8e7cb",
    label: "REUNITED",
    icon: "🤝",
  },
};

export default async function MissingPersonsPage() {
  let missingPersons: MissingPersonItem[] = [];

  try {
    const records = await prisma.missingPerson.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        district: { select: { name: true } },
      },
    });

    missingPersons = records.map((record) => ({
      id: record.id,
      name: record.name,
      status: record.status,
      locationName: record.locationName,
      contactName: record.contactName,
      contactPhone: record.contactPhone,
      photoUrl: record.photoUrl,
      description: record.description,
      lastSeenAt: record.lastSeenAt,
      createdAt: record.createdAt,
      district: record.district,
    }));
  } catch (dbError) {
    console.error("Database query error for missing persons:", dbError);
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/dashboard/citizen"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#087d7a",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span>←</span> Back to Citizen Portal
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <p
          style={{
            color: "#087d7a",
            font: "700 11px 'DM Sans', sans-serif",
            letterSpacing: "1.7px",
            margin: "0 0 6px",
            textTransform: "uppercase",
          }}
        >
          CITIZEN DISASTER REGISTRY
        </p>
        <h1
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: "34px",
            margin: "0 0 8px",
            color: "#17323b",
            lineHeight: 1.2,
          }}
        >
          Report Missing Person
        </h1>
        <p style={{ color: "#71858a", fontSize: "16px", margin: 0, lineHeight: 1.5 }}>
          Submit details about an unaccounted family member or acquaintance. Reports are indexed into district search grids and cross-referenced with shelter registries and triage stations.
        </p>
      </div>

      {/* Primary Report Form Card */}
      <div
        style={{
          background: "white",
          border: "1px solid #dce7e6",
          borderRadius: "12px",
          padding: "32px",
          marginBottom: "36px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <span style={{ fontSize: "24px" }}>📝</span>
          <div>
            <h2
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
                fontSize: "20px",
                color: "#17323b",
                margin: 0,
              }}
            >
              Missing Person Information Form
            </h2>
            <p style={{ fontSize: "13px", color: "#71858a", margin: "4px 0 0" }}>
              High-priority fields are marked with an asterisk (*). Touch targets are sized for rapid emergency entry.
            </p>
          </div>
        </div>

        <MissingPersonForm />
      </div>

      {/* Registered Missing Persons Section */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 700,
                fontSize: "24px",
                color: "#17323b",
                margin: "0 0 4px",
              }}
            >
              Recent Missing Person Records ({missingPersons.length})
            </h2>
            <p style={{ fontSize: "14px", color: "#71858a", margin: 0 }}>
              Live public notices. Exact coordinates are protected to preserve personal safety.
            </p>
          </div>
        </div>

        {missingPersons.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #dce7e6",
              borderRadius: "12px",
              padding: "40px 20px",
              textAlign: "center",
              color: "#71858a",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: "15px" }}>
              No missing person reports currently registered.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>
              New submissions will appear here once entered.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "18px",
            }}
          >
            {missingPersons.map((person) => {
              const statusCfg = STATUS_CONFIG[person.status] || STATUS_CONFIG.MISSING;
              const formattedDate = person.lastSeenAt
                ? new Date(person.lastSeenAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : null;

              return (
                <div
                  key={person.id}
                  style={{
                    background: "white",
                    border: "1px solid #dce7e6",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div>
                    {/* Header: Name and Status Badge */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {person.photoUrl ? (
                          <img
                            src={person.photoUrl}
                            alt={person.name}
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "8px",
                              objectFit: "cover",
                              border: "1px solid #dce7e6",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "8px",
                              background: "#e8f4f1",
                              color: "#087d7a",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "18px",
                              fontFamily: "Outfit, sans-serif",
                            }}
                          >
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3
                            style={{
                              fontFamily: "Outfit, sans-serif",
                              fontWeight: 700,
                              fontSize: "18px",
                              color: "#17323b",
                              margin: 0,
                            }}
                          >
                            {person.name}
                          </h3>
                          {person.district?.name && (
                            <span style={{ fontSize: "12px", color: "#71858a" }}>
                              {person.district.name} District
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        style={{
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.border}`,
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{statusCfg.icon}</span>
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Details List */}
                    <div style={{ fontSize: "13px", color: "#577276", display: "grid", gap: "6px" }}>
                      {person.locationName && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span style={{ flexShrink: 0 }}>📍</span>
                          <span>
                            <strong>Last seen at:</strong> {person.locationName}
                          </span>
                        </div>
                      )}

                      {formattedDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ flexShrink: 0 }}>🕒</span>
                          <span>
                            <strong>When:</strong> {formattedDate}
                          </span>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ flexShrink: 0 }}>👤</span>
                        <span>
                          <strong>Contact:</strong> {person.contactName}
                        </span>
                      </div>

                      {person.description && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: "13px",
                            color: "#495e62",
                            lineHeight: 1.4,
                            background: "#f9fbfa",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #eef3f2",
                          }}
                        >
                          {person.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid #f0f6f5",
                      fontSize: "11px",
                      color: "#91a2a4",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>ID: {person.id.slice(-6).toUpperCase()}</span>
                    <span>No public GPS</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note on Precise Location Access */}
      <div
        style={{
          background: "#fff9eb",
          border: "1px solid #f2d28d",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "32px",
        }}
      >
        <span style={{ fontSize: "22px", flexShrink: 0 }}>🛡️</span>
        <p style={{ margin: 0, fontSize: "13px", color: "#775d10", lineHeight: 1.5 }}>
          <strong>Privacy & Rescue Protocol:</strong> Precise location data is only shared with verified district authorities and search and rescue teams. Public viewers see general landmark localities to preserve citizen safety.
        </p>
      </div>
    </div>
  );
}
