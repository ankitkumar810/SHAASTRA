/**
 * NDMA SACHET India CAP (Common Alerting Protocol) RSS / Feed Integration Boundary
 *
 * Official Integration Architecture:
 * Official NDMA SACHET Feed -> Server Ingestion -> CAP Normalization & Storage -> Geographic Matching -> SHAASTRA Alert Pipeline
 *
 * Note: Scraping or unofficial endpoints are strictly prohibited by engineering rules.
 * This file establishes the official architectural interfaces for the upcoming Phase 6/7 alert integration.
 */

export interface CapAlertInfo {
  identifier: string;
  sender: string;
  sentAt: Date;
  status: "Actual" | "Exercise" | "System" | "Test" | "Draft";
  msgType: "Alert" | "Update" | "Cancel" | "Ack" | "Error";
  scope: "Public" | "Restricted" | "Private";
  category: "Geo" | "Met" | "Safety" | "Security" | "Rescue" | "Fire" | "Health" | "Env" | "Transport" | "Infra" | "Other";
  event: string;
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  certainty: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
  headline: string;
  description: string;
  instruction?: string;
  areaDescription: string;
  affectedDistricts: string[];
}

export interface NdmaIngestionResult {
  success: boolean;
  alertsIngested: number;
  matchedAlerts: number;
  timestamp: Date;
  message: string;
}

export class NdmaSachetService {
  /**
   * Normalize an official CAP RSS alert item into SHAASTRA internal alert structure.
   */
  public static normalizeCapAlert(cap: CapAlertInfo) {
    return {
      title: `${cap.event}: ${cap.headline || cap.areaDescription}`,
      description: cap.description,
      severity: cap.severity === "Extreme" || cap.severity === "Severe" ? "CRITICAL" : cap.severity === "Moderate" ? "WARNING" : "INFO",
      areaDescription: cap.areaDescription,
      affectedDistricts: cap.affectedDistricts,
      source: "NDMA_SACHET_CAP",
      externalId: cap.identifier,
    };
  }
}
