export type ShelterStatus = "Open" | "Limited" | "Full";

export interface Shelter {
  id: string;
  name: string;
  area: string;
  availableBeds: number;
  totalBeds: number;
  food: string;
  medicine: string;
  status: ShelterStatus;
}

export interface SafeRecord {
  id: string;
  name: string;
  shelter: string;
  message: string;
  phone?: string;
  photoUrl?: string;
  verificationStatus?: "VERIFIED_SAFE" | "PENDING_VERIFICATION" | "REJECTED";
  verifiedBy?: string;
  createdAt?: string;
}

export interface AlertItem {
  icon: string;
  title: string;
  description: string;
}

export interface ActivityItem {
  icon: string;
  description: string;
  time: string;
}

// ── Phase 4: GPS Consent, Missing Persons, Incidents ──────────────────────────

export type ConsentStatus = "GRANTED" | "REVOKED" | "EXPIRED";
export type MissingPersonStatus = "MISSING" | "LOCATED" | "SAFE" | "REUNITED";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface LocationConsentRecord {
  id: string;
  userId: string;
  consentStatus: ConsentStatus;
  startedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface MissingPersonRecord {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  lastSeenAt: string | null;
  /** Precise GPS — only present for authorized callers */
  lastSeenLatitude: number | null;
  /** Precise GPS — only present for authorized callers */
  lastSeenLongitude: number | null;
  locationName: string | null;
  contactName: string;
  contactPhone: string;
  status: MissingPersonStatus;
  districtId: string | null;
  createdAt: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  hazardType: string;
  country: string;
  state: string;
  source: string;
  sourceUrl: string | null;
  isLive: boolean;
  severity: IncidentSeverity;
  latitude: number | null;
  longitude: number | null;
  summary: string;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
}
