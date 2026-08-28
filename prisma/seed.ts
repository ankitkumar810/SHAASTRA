import { PrismaClient, Role, ShelterStatus, AlertSeverity, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SHAASTRA database with multi-district shelters...");

  // 1. Create Districts & Zones
  const ernakulam = await prisma.district.upsert({
    where: { name: "Ernakulam" },
    update: {},
    create: {
      name: "Ernakulam",
      state: "Kerala",
      zones: {
        create: [
          { name: "Ernakulam North" },
          { name: "Kalamassery" },
          { name: "Aluva" },
          { name: "Edappally" },
        ],
      },
    },
    include: { zones: true },
  });

  const kozhikode = await prisma.district.upsert({
    where: { name: "Kozhikode" },
    update: {},
    create: {
      name: "Kozhikode",
      state: "Kerala",
      zones: {
        create: [
          { name: "Kozhikode City" },
          { name: "Vadakara" },
        ],
      },
    },
    include: { zones: true },
  });

  const wayanad = await prisma.district.upsert({
    where: { name: "Wayanad" },
    update: {},
    create: {
      name: "Wayanad",
      state: "Kerala",
      zones: {
        create: [
          { name: "Meppadi" },
          { name: "Kalpetta" },
        ],
      },
    },
    include: { zones: true },
  });

  const eZoneMap = new Map(ernakulam.zones.map((z) => [z.name, z.id]));
  const kZoneMap = new Map(kozhikode.zones.map((z) => [z.name, z.id]));
  const wZoneMap = new Map(wayanad.zones.map((z) => [z.name, z.id]));

  // 2. Create System Admin Profile
  const systemAdmin = await prisma.profile.upsert({
    where: { email: "admin@shaastra.gov.in" },
    update: {},
    create: {
      email: "admin@shaastra.gov.in",
      fullName: "District Disaster Control Room",
      role: Role.DISTRICT_AUTHORITY,
      verificationStatus: VerificationStatus.VERIFIED,
      districtId: ernakulam.id,
    },
  });

  // 3. Create Shelters
  const sheltersData = [
    {
      id: "st-teresas",
      name: "St. Teresa's Relief Centre",
      locality: "Ernakulam North",
      districtId: ernakulam.id,
      zoneId: eZoneMap.get("Ernakulam North"),
      address: "St. Teresa's College Campus, Park Avenue, Ernakulam",
      totalBeds: 110,
      occupiedBeds: 38,
      availableBeds: 72,
      foodStockStatus: "Food 3 days",
      medicineStockStatus: "Medicine ready",
      status: ShelterStatus.OPEN,
      latitude: 9.9790,
      longitude: 76.2760,
    },
    {
      id: "kalamassery-hall",
      name: "Kalamassery Community Hall",
      locality: "Kalamassery",
      districtId: ernakulam.id,
      zoneId: eZoneMap.get("Kalamassery"),
      address: "Main Road, Near Town Bus Stand, Kalamassery",
      totalBeds: 150,
      occupiedBeds: 132,
      availableBeds: 18,
      foodStockStatus: "Food 1 day",
      medicineStockStatus: "Medicine low",
      status: ShelterStatus.LIMITED,
      latitude: 10.0540,
      longitude: 76.3180,
    },
    {
      id: "aluva-hall",
      name: "Aluva Town Hall",
      locality: "Aluva",
      districtId: ernakulam.id,
      zoneId: eZoneMap.get("Aluva"),
      address: "Town Hall Complex, Bank Road, Aluva",
      totalBeds: 120,
      occupiedBeds: 26,
      availableBeds: 94,
      foodStockStatus: "Food 4 days",
      medicineStockStatus: "Medicine ready",
      status: ShelterStatus.OPEN,
      latitude: 10.1080,
      longitude: 76.3570,
    },
    {
      id: "edappally-school",
      name: "Edappally School Shelter",
      locality: "Edappally",
      districtId: ernakulam.id,
      zoneId: eZoneMap.get("Edappally"),
      address: "Government High School, Bypass Junction, Edappally",
      totalBeds: 85,
      occupiedBeds: 85,
      availableBeds: 0,
      foodStockStatus: "Food 2 days",
      medicineStockStatus: "Medicine ready",
      status: ShelterStatus.FULL,
      latitude: 10.0260,
      longitude: 76.3080,
    },
    {
      id: "kozhikode-stadium-hall",
      name: "Kozhikode Indoor Stadium Camp",
      locality: "Kozhikode City",
      districtId: kozhikode.id,
      zoneId: kZoneMap.get("Kozhikode City"),
      address: "Mavoor Road Junction, Kozhikode City",
      totalBeds: 200,
      occupiedBeds: 60,
      availableBeds: 140,
      foodStockStatus: "Food 5 days",
      medicineStockStatus: "Medicine ready",
      status: ShelterStatus.OPEN,
      latitude: 11.2588,
      longitude: 75.7804,
    },
    {
      id: "meppadi-school-camp",
      name: "Meppadi Higher Secondary School",
      locality: "Meppadi",
      districtId: wayanad.id,
      zoneId: wZoneMap.get("Meppadi"),
      address: "Main Road, Meppadi, Wayanad",
      totalBeds: 160,
      occupiedBeds: 110,
      availableBeds: 50,
      foodStockStatus: "Food 2 days",
      medicineStockStatus: "Medicine ready",
      status: ShelterStatus.OPEN,
      latitude: 11.5510,
      longitude: 76.1260,
    },
  ];

  const shelterMap = new Map<string, string>();

  for (const data of sheltersData) {
    const shelter = await prisma.shelter.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    shelterMap.set(shelter.name, shelter.id);
  }

  // 4. Create Safe Records
  const safeRecordsData = [
    {
      fullName: "Ananya Nair",
      shelterId: shelterMap.get("St. Teresa's Relief Centre"),
      generalLocation: "Ernakulam North",
      message: "I am with my sister and safe.",
      isPrivate: false,
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      fullName: "Ravi Kumar",
      shelterId: shelterMap.get("Aluva Town Hall"),
      generalLocation: "Aluva",
      message: "Safe and awaiting transport.",
      isPrivate: false,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  ];

  for (const record of safeRecordsData) {
    await prisma.safeRecord.create({
      data: record,
    });
  }

  // 5. Create Alerts
  const alertsData = [
    {
      shelterId: shelterMap.get("Kalamassery Community Hall"),
      districtId: ernakulam.id,
      icon: "⚠",
      title: "Medicine stock is low",
      description: "Kalamassery Community Hall has less than 24 hours of essential medicine.",
      severity: AlertSeverity.CRITICAL,
    },
  ];

  for (const alert of alertsData) {
    await prisma.alert.create({
      data: alert,
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
