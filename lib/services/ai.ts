import { prisma } from "@/lib/prisma";

export interface ShelterCardData {
  id: string;
  name: string;
  locality: string;
  availableBeds: number;
  foodStockStatus: string;
  medicineStockStatus: string;
  status: string;
}

export interface AssistantResponse {
  heading: string;
  actionPoints: string[];
  shelters?: ShelterCardData[];
  primaryCta?: { label: string; href: string };
  sources: Array<{ title: string; lastUpdated: string }>;
  uncertainty: string;
  escalationNeeded: boolean;
  emergencyContacts: Array<{ name: string; number: string }>;
  answer: string; // Backward compatibility string
}

export async function generateGroundedAIResponse(
  userQuery: string,
  districtName: string = "Ernakulam"
): Promise<AssistantResponse> {
  const queryLower = userQuery.toLowerCase();
  const sources: Array<{ title: string; lastUpdated: string }> = [];

  // 1. Fetch grounded shelter facts from DB
  let groundedShelters: Array<{
    id: string;
    name: string;
    locality: string;
    availableBeds: number;
    foodStockStatus: string;
    medicineStockStatus: string;
    status: string;
    lastUpdated: Date;
  }> = [];

  try {
    groundedShelters = await prisma.shelter.findMany({
      take: 4,
      orderBy: { availableBeds: "desc" },
      select: {
        id: true,
        name: true,
        locality: true,
        availableBeds: true,
        foodStockStatus: true,
        medicineStockStatus: true,
        status: true,
        lastUpdated: true,
      },
    });
  } catch (err) {
    console.error("Grounded AI DB retrieval error:", err);
  }

  // 2. Fetch grounded alert facts & predictions from DB
  let groundedAlerts: Array<{ title: string; description: string; createdAt: Date }> = [];
  let criticalPredictions: Array<{ shelterName: string; resourceType: string; reason: string }> = [];

  try {
    groundedAlerts = await prisma.alert.findMany({
      take: 2,
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { title: true, description: true, createdAt: true },
    });
  } catch (err) {
    console.error("Grounded AI alert retrieval error:", err);
  }

  try {
    const { evaluateShelterPredictions } = await import("@/lib/services/prediction");
    const predSummary = await evaluateShelterPredictions();
    criticalPredictions = predSummary.highestRiskItems
      .filter((item) => item.riskLevel === "CRITICAL" || item.riskLevel === "AT_RISK")
      .slice(0, 2)
      .map((item) => ({
        shelterName: item.shelterName,
        resourceType: item.resourceType,
        reason: item.reason,
      }));
  } catch (err) {
    console.error("Grounded AI prediction retrieval error:", err);
  }

  // Record sources (hidden behind collapsible drawer in UI)
  groundedShelters.forEach((s) => {
    sources.push({
      title: `${s.name} (${s.availableBeds} beds available)`,
      lastUpdated: new Date(s.lastUpdated).toLocaleTimeString(),
    });
  });

  criticalPredictions.forEach((p) => {
    sources.push({
      title: `Resource Warning: ${p.shelterName} (${p.resourceType} ${p.reason})`,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  });

  // Emergency escalation check
  const isEmergency =
    queryLower.includes("emergency") ||
    queryLower.includes("help") ||
    queryLower.includes("trapped") ||
    queryLower.includes("rescue") ||
    queryLower.includes("drowning") ||
    queryLower.includes("112");

  // 3. Response Generation (Structured, Concise, Scannable)
  let heading = "";
  let actionPoints: string[] = [];
  let shelters: ShelterCardData[] | undefined = undefined;
  let primaryCta: { label: string; href: string } | undefined = undefined;

  if (queryLower.includes("shelter") || queryLower.includes("bed") || queryLower.includes("stay") || queryLower.includes("available") || queryLower.includes("most")) {
    heading = "Open Relief Shelters Nearby";
    actionPoints = [
      "Check available bed counts listed on the shelter cards below.",
      "Head to the nearest shelter with free capacity immediately.",
      "Bring essential medications and personal photo ID if safe.",
    ];

    if (groundedShelters.length > 0) {
      shelters = groundedShelters.map((s) => ({
        id: s.id,
        name: s.name,
        locality: s.locality,
        availableBeds: s.availableBeds,
        foodStockStatus: s.foodStockStatus,
        medicineStockStatus: s.medicineStockStatus,
        status: s.status,
      }));
    }

    primaryCta = {
      label: "Explore All Shelters on Map →",
      href: "/dashboard/citizen/shelters",
    };
  } else if (queryLower.includes("flood") || queryLower.includes("water") || queryLower.includes("rain")) {
    heading = "Immediate Flood Action Guide";
    actionPoints = [
      "Move to higher ground or upper floors immediately.",
      "Never walk or drive through flowing floodwaters.",
      "Turn off main electricity and gas switches if safe to do so.",
      "Keep your phone charged and emergency kit accessible.",
    ];
    primaryCta = {
      label: "Find Nearby Safe Shelter →",
      href: "/dashboard/citizen/shelters",
    };
  } else if (queryLower.includes("cyclone") || queryLower.includes("wind") || queryLower.includes("storm")) {
    heading = "Immediate Cyclone Action Guide";
    actionPoints = [
      "Stay indoors away from glass doors and external windows.",
      "Disconnect electrical appliances to prevent surge damage.",
      "Secure loose outdoor objects and stay tuned for advisories.",
      "Do not go outside during the calm eye of the storm.",
    ];
    primaryCta = {
      label: "Find Nearby Safe Shelter →",
      href: "/dashboard/citizen/shelters",
    };
  } else if (isEmergency) {
    heading = "Emergency Response Contacts";
    actionPoints = [
      "Call National Emergency Number 112 immediately for life rescue.",
      "Call District Control Room 1077 for local relief dispatch.",
      "Share your location with trusted family or emergency operators.",
      "If safe, move to the nearest verified shelter.",
    ];
    primaryCta = {
      label: "Call National Emergency 112 Now",
      href: "tel:112",
    };
  } else {
    heading = "SHAASTRA Disaster Support";
    actionPoints = [
      "Find verified nearby shelters with live bed capacity.",
      "Register your status on the 'I'm Safe' family registry.",
      "Report road blockages or urgent resource shortages.",
    ];
    primaryCta = {
      label: "Find Open Shelter →",
      href: "/dashboard/citizen/shelters",
    };
  }

  // Legacy string for backwards compatibility
  const legacyString = `${heading}\n\n${actionPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;

  return {
    heading,
    actionPoints,
    shelters,
    primaryCta,
    sources,
    uncertainty: "Data grounded in verified SHAASTRA database entries. Real-time conditions may change rapidly.",
    escalationNeeded: isEmergency,
    emergencyContacts: [
      { name: "National Emergency", number: "112" },
      { name: "District Disaster Control", number: "1077" },
    ],
    answer: legacyString,
  };
}
