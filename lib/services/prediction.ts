import { prisma } from "@/lib/prisma";

export type RiskLevel = "SAFE" | "WATCH" | "AT_RISK" | "CRITICAL" | "INSUFFICIENT_DATA";
export type ResourceType = "FOOD" | "MEDICINE" | "WATER";

export interface ResourcePredictionItem {
  packetId: string;
  shelterId: string;
  shelterName: string;
  districtName: string;
  resourceType: ResourceType;
  riskLevel: RiskLevel;
  estimatedHoursRemaining: number | null;
  currentStatus: string;
  reason: string;
  recommendedAction: string;
  dataFreshness: string;
  lastUpdated: Date;
  ttl: number; // For Phase 10 Offline TTL
}

export interface PredictionSummary {
  totalSheltersEvaluated: number;
  riskCounts: {
    CRITICAL: number;
    AT_RISK: number;
    WATCH: number;
    SAFE: number;
    INSUFFICIENT_DATA: number;
  };
  highestRiskItems: ResourcePredictionItem[];
  lastEvaluatedAt: Date;
}

// Configurable Thresholds
export const PREDICTION_THRESHOLDS = {
  CRITICAL_HOURS: 24,
  AT_RISK_HOURS: 48,
  WATCH_HOURS: 72,
  HIGH_OCCUPANCY_PERCENT: 85,
  STALE_DATA_HOURS: 72,
};

function parseFoodDays(statusStr: string, inventoryDays?: number | null): number | null {
  if (inventoryDays !== undefined && inventoryDays !== null && !isNaN(inventoryDays)) {
    return inventoryDays;
  }
  const match = statusStr.match(/(\d+(\.\d+)?)\s*day/i);
  if (match) {
    return parseFloat(match[1]);
  }
  if (statusStr.toLowerCase().includes("critical") || statusStr.toLowerCase().includes("depleted")) return 0.5;
  if (statusStr.toLowerCase().includes("low")) return 1.5;
  if (statusStr.toLowerCase().includes("ready") || statusStr.toLowerCase().includes("adequate")) return 4.0;
  return null;
}

export async function evaluateShelterPredictions(
  districtIdFilter?: string
): Promise<PredictionSummary> {
  const whereClause: any = {};
  if (districtIdFilter) {
    whereClause.districtId = districtIdFilter;
  }

  const shelters = await prisma.shelter.findMany({
    where: whereClause,
    include: {
      district: { select: { name: true } },
      inventories: { take: 1, orderBy: { recordedAt: "desc" } },
      safeRecords: { select: { id: true } },
    },
  });

  const allItems: ResourcePredictionItem[] = [];
  const riskCounts = {
    CRITICAL: 0,
    AT_RISK: 0,
    WATCH: 0,
    SAFE: 0,
    INSUFFICIENT_DATA: 0,
  };

  const now = new Date();

  for (const shelter of shelters) {
    const hoursSinceUpdate = (now.getTime() - new Date(shelter.lastUpdated).getTime()) / (1000 * 60 * 60);
    const isStale = hoursSinceUpdate > PREDICTION_THRESHOLDS.STALE_DATA_HOURS;
    const occupancyRate = shelter.totalBeds > 0 ? (shelter.occupiedBeds / shelter.totalBeds) * 100 : 0;
    const latestInventory = shelter.inventories[0];

    // 1. Food Prediction
    const foodDays = parseFoodDays(shelter.foodStockStatus, latestInventory?.foodDays);
    let foodRisk: RiskLevel = "SAFE";
    let foodHours: number | null = null;
    let foodReason = "";
    let foodAction = "";

    if (isStale || foodDays === null) {
      foodRisk = "INSUFFICIENT_DATA";
      foodReason = `Inventory update overdue (${Math.round(hoursSinceUpdate)}h since last report).`;
      foodAction = "Request immediate inventory status update from shelter manager.";
    } else {
      foodHours = Math.round(foodDays * 24 * (occupancyRate > 90 ? 0.8 : 1.0));
      if (foodHours < PREDICTION_THRESHOLDS.CRITICAL_HOURS) {
        foodRisk = "CRITICAL";
        foodReason = `Estimated food supply depleted in ~${foodHours} hours based on current occupancy (${shelter.occupiedBeds} evacuees).`;
        foodAction = "Dispatch emergency food rations immediately.";
      } else if (foodHours < PREDICTION_THRESHOLDS.AT_RISK_HOURS) {
        foodRisk = "AT_RISK";
        foodReason = `Food stock estimated under 48h supply (~${foodHours} hours remaining).`;
        foodAction = "Schedule food supply replenishment within 12 hours.";
      } else if (foodHours < PREDICTION_THRESHOLDS.WATCH_HOURS || occupancyRate >= PREDICTION_THRESHOLDS.HIGH_OCCUPANCY_PERCENT) {
        foodRisk = "WATCH";
        foodReason = `High shelter occupancy (${Math.round(occupancyRate)}%) accelerating ration consumption.`;
        foodAction = "Monitor supply consumption closely.";
      } else {
        foodRisk = "SAFE";
        foodReason = `Sufficient food supply estimated for ~${foodHours} hours (~${(foodHours / 24).toFixed(1)} days).`;
        foodAction = "Maintain standard inventory reporting schedule.";
      }
    }

    riskCounts[foodRisk]++;
    allItems.push({
      packetId: `pred_${shelter.id}_food_${now.getTime()}`,
      shelterId: shelter.id,
      shelterName: shelter.name,
      districtName: shelter.district.name,
      resourceType: "FOOD",
      riskLevel: foodRisk,
      estimatedHoursRemaining: foodHours,
      currentStatus: shelter.foodStockStatus,
      reason: foodReason,
      recommendedAction: foodAction,
      dataFreshness: new Date(shelter.lastUpdated).toLocaleTimeString(),
      lastUpdated: shelter.lastUpdated,
      ttl: 86400,
    });

    // 2. Medicine Prediction
    let medRisk: RiskLevel = "SAFE";
    let medHours: number | null = null;
    let medReason = "";
    let medAction = "";

    const medStatus = (latestInventory?.medicineStatus || shelter.medicineStockStatus).toLowerCase();

    if (isStale) {
      medRisk = "INSUFFICIENT_DATA";
      medReason = "Medical inventory data is stale (>72 hours old).";
      medAction = "Request immediate medical stock audit.";
    } else if (medStatus.includes("critical") || medStatus.includes("depleted")) {
      medRisk = "CRITICAL";
      medHours = 12;
      medReason = "Essential medical kits critical or depleted.";
      medAction = "Resupply first-aid and essential chronic disease medications immediately.";
    } else if (medStatus.includes("low")) {
      medRisk = "AT_RISK";
      medHours = 36;
      medReason = "Medical supplies running low under current evacuee demand.";
      medAction = "Dispatch mobile medical unit or supply kit.";
    } else if (occupancyRate >= PREDICTION_THRESHOLDS.HIGH_OCCUPANCY_PERCENT) {
      medRisk = "WATCH";
      medHours = 60;
      medReason = "High occupancy increases risk of minor injury and illness spikes.";
      medAction = "Ensure basic medical kit is accessible.";
    } else {
      medRisk = "SAFE";
      medHours = 96;
      medReason = "Adequate medical supply confirmed by shelter manager.";
      medAction = "Continue regular monitoring.";
    }

    riskCounts[medRisk]++;
    allItems.push({
      packetId: `pred_${shelter.id}_med_${now.getTime()}`,
      shelterId: shelter.id,
      shelterName: shelter.name,
      districtName: shelter.district.name,
      resourceType: "MEDICINE",
      riskLevel: medRisk,
      estimatedHoursRemaining: medHours,
      currentStatus: shelter.medicineStockStatus,
      reason: medReason,
      recommendedAction: medAction,
      dataFreshness: new Date(shelter.lastUpdated).toLocaleTimeString(),
      lastUpdated: shelter.lastUpdated,
      ttl: 86400,
    });

    // 3. Water Prediction
    const waterDays = latestInventory?.waterDays ?? 3.0;
    let waterRisk: RiskLevel = "SAFE";
    let waterHours: number | null = Math.round(waterDays * 24);
    let waterReason = "";
    let waterAction = "";

    if (isStale) {
      waterRisk = "INSUFFICIENT_DATA";
      waterHours = null;
      waterReason = "Water stock data overdue for verification.";
      waterAction = "Verify clean water tankers or local filtration status.";
    } else if (waterHours < PREDICTION_THRESHOLDS.CRITICAL_HOURS) {
      waterRisk = "CRITICAL";
      waterReason = `Potable water estimated below 24h supply (~${waterHours}h remaining).`;
      waterAction = "Dispatch clean water tankers immediately.";
    } else if (waterHours < PREDICTION_THRESHOLDS.AT_RISK_HOURS) {
      waterRisk = "AT_RISK";
      waterReason = `Water supply low (~${waterHours}h remaining).`;
      waterAction = "Coordinate water purification kit delivery.";
    } else {
      waterRisk = "SAFE";
      waterReason = `Potable water confirmed for ~${waterHours} hours.`;
      waterAction = "Maintain clean water supply supervision.";
    }

    riskCounts[waterRisk]++;
    allItems.push({
      packetId: `pred_${shelter.id}_water_${now.getTime()}`,
      shelterId: shelter.id,
      shelterName: shelter.name,
      districtName: shelter.district.name,
      resourceType: "WATER",
      riskLevel: waterRisk,
      estimatedHoursRemaining: waterHours,
      currentStatus: shelter.waterStockStatus || `${waterDays} days water`,
      reason: waterReason,
      recommendedAction: waterAction,
      dataFreshness: new Date(shelter.lastUpdated).toLocaleTimeString(),
      lastUpdated: shelter.lastUpdated,
      ttl: 86400,
    });
  }

  // Sort highest-risk items first (CRITICAL -> AT_RISK -> WATCH -> INSUFFICIENT_DATA -> SAFE)
  const severityOrder: Record<RiskLevel, number> = {
    CRITICAL: 1,
    AT_RISK: 2,
    WATCH: 3,
    INSUFFICIENT_DATA: 4,
    SAFE: 5,
  };

  allItems.sort((a, b) => severityOrder[a.riskLevel] - severityOrder[b.riskLevel]);

  return {
    totalSheltersEvaluated: shelters.length,
    riskCounts,
    highestRiskItems: allItems,
    lastEvaluatedAt: now,
  };
}
