"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ShelterMap = dynamic(() => import("@/components/ShelterMap").then((mod) => mod.ShelterMap), {
  ssr: false,
  loading: () => <div style={{ height: "100%", minHeight: "450px", background: "#e8f4f1", borderRadius: "12px", display: "grid", placeItems: "center", color: "#087d7a" }}>Loading OpenStreetMap...</div>,
});

export interface ShelterItem {
  id: string;
  name: string;
  locality: string;
  address: string;
  districtId: string;
  zoneId: string | null;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  foodStockStatus: string;
  medicineStockStatus: string;
  waterStockStatus: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: Date;
  districtName: string;
  zoneName: string | null;
}

interface Props {
  initialShelters: ShelterItem[];
  districts: Array<{ id: string; name: string }>;
}

export function ShelterDiscoveryClient({ initialShelters, districts }: Props) {
  const [query, setQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");
  const [selectedShelterId, setSelectedShelterId] = useState<string | undefined>(undefined);

  const filteredShelters = useMemo(() => {
    return initialShelters.filter((s) => {
      const q = query.toLowerCase();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.locality.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
      const matchesDistrict = districtFilter === "ALL" || s.districtName === districtFilter;
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;

      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [initialShelters, query, districtFilter, statusFilter]);

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by shelter name, locality, or address..."
            style={{
              width: "100%",
              padding: "11px 14px 11px 36px",
              borderRadius: "8px",
              border: "1px solid #dce7e6",
              fontSize: "14px",
              outlineColor: "#087d7a",
            }}
          />
          <span style={{ position: "absolute", left: "12px", top: "10px", color: "#71858a", fontSize: "16px" }}>⌕</span>
        </div>

        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          style={{ padding: "11px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "13px", background: "white" }}
        >
          <option value="ALL">All Districts</option>
          {districts.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "11px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "13px", background: "white" }}
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open (Available Beds)</option>
          <option value="LIMITED">Limited Space</option>
          <option value="FULL">Full</option>
          <option value="CLOSED">Closed</option>
        </select>

        <div style={{ display: "flex", background: "white", border: "1px solid #dce7e6", borderRadius: "8px", overflow: "hidden", marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            style={{ padding: "8px 14px", border: 0, background: viewMode === "split" ? "#e9f7f4" : "transparent", color: viewMode === "split" ? "#087d7a" : "#71858a", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            style={{ padding: "8px 14px", border: 0, background: viewMode === "list" ? "#e9f7f4" : "transparent", color: viewMode === "list" ? "#087d7a" : "#71858a", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >
            List Only
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            style={{ padding: "8px 14px", border: 0, background: viewMode === "map" ? "#e9f7f4" : "transparent", color: viewMode === "map" ? "#087d7a" : "#71858a", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >
            Map View
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: viewMode === "list" ? "1fr" : viewMode === "map" ? "1fr" : "1fr 1fr", gap: "24px" }}>
        {(viewMode === "split" || viewMode === "list") && (
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            {filteredShelters.length > 0 ? (
              filteredShelters.map((shelter) => {
                const occupancy = Math.round(((shelter.totalBeds - shelter.availableBeds) / shelter.totalBeds) * 100);
                const isSelected = selectedShelterId === shelter.id;

                return (
                  <article
                    key={shelter.id}
                    onClick={() => setSelectedShelterId(shelter.id)}
                    style={{
                      background: "white",
                      border: isSelected ? "2px solid #087d7a" : "1px solid #dce7e6",
                      borderRadius: "12px",
                      padding: "20px",
                      position: "relative",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: isSelected ? "0 4px 16px rgba(8,125,122,0.12)" : "none",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        right: "20px",
                        top: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "4px 9px",
                        borderRadius: "10px",
                        color: shelter.status === "OPEN" ? "#087b68" : shelter.status === "LIMITED" ? "#aa6a13" : "#b64b3d",
                        background: shelter.status === "OPEN" ? "#e2f6ed" : shelter.status === "LIMITED" ? "#fff1d9" : "#fee8e4",
                      }}
                    >
                      {shelter.status}
                    </span>

                    <h3 style={{ font: "600 18px Outfit", margin: "0 0 6px", color: "#17323b" }}>{shelter.name}</h3>
                    <p style={{ margin: "0 0 12px", color: "#71858a", fontSize: "13px" }}>
                      ⌖ {shelter.locality} · <span style={{ color: "#087d7a" }}>{shelter.districtName}</span>
                    </p>

                    <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#577276", marginBottom: "16px" }}>
                      <span>▣ {shelter.foodStockStatus}</span>
                      <span>✚ {shelter.medicineStockStatus}</span>
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                        <span><strong style={{ color: "#087b68" }}>{shelter.availableBeds}</strong> beds available</span>
                        <span style={{ color: "#71858a" }}>{occupancy}% occupied</span>
                      </div>
                      <div style={{ height: "6px", background: "#e6eeee", borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${occupancy}%`, background: "#087d7a", borderRadius: "5px" }} />
                      </div>
                    </div>

                    <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f0f6f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#91a2a4" }}>Updated: {new Date(shelter.lastUpdated).toLocaleTimeString()}</span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        {shelter.latitude !== null && shelter.longitude !== null && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#075c63", font: "600 13px 'DM Sans'", textDecoration: "none" }}
                          >
                            Directions ↗
                          </a>
                        )}
                        <Link
                          href={`/dashboard/citizen/shelters/${shelter.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "#087d7a", font: "600 13px 'DM Sans'", textDecoration: "none" }}
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div style={{ background: "white", padding: "30px", borderRadius: "12px", textAlign: "center", border: "1px solid #dce7e6", color: "#71858a" }}>
                No shelters match the current search or filters.
              </div>
            )}
          </div>
        )}

        {(viewMode === "split" || viewMode === "map") && (
          <div style={{ height: "100%", minHeight: "500px", position: "sticky", top: "20px" }}>
            <ShelterMap shelters={filteredShelters} selectedShelterId={selectedShelterId} onSelectShelter={setSelectedShelterId} />
          </div>
        )}
      </div>
    </div>
  );
}
