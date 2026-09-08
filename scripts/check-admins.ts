import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Checking SYSTEM_ADMIN records ===");
  const sysAdmins = await prisma.profile.findMany({
    where: { role: "SYSTEM_ADMIN" },
    select: { id: true, email: true, fullName: true, role: true, verificationStatus: true, createdAt: true },
  });
  if (sysAdmins.length === 0) {
    console.log("  [RESULT] No SYSTEM_ADMIN profiles found in the database.");
  } else {
    console.log(`  [RESULT] Found ${sysAdmins.length} SYSTEM_ADMIN profile(s):`);
    console.log(JSON.stringify(sysAdmins, null, 2));
  }

  console.log("\n=== Checking all privileged profiles (any non-CITIZEN role) ===");
  const privileged = await prisma.profile.findMany({
    where: { role: { not: "CITIZEN" } },
    select: { id: true, email: true, fullName: true, role: true, verificationStatus: true, createdAt: true },
  });
  if (privileged.length === 0) {
    console.log("  [RESULT] No privileged profiles found.");
  } else {
    console.log(`  [RESULT] Found ${privileged.length} privileged profile(s):`);
    console.log(JSON.stringify(privileged, null, 2));
  }

  console.log("\n=== Checking seed profile (admin@shaastra.gov.in) ===");
  const seedAdmin = await prisma.profile.findFirst({
    where: { email: "admin@shaastra.gov.in" },
    select: { id: true, email: true, fullName: true, role: true, verificationStatus: true, createdAt: true },
  });
  if (!seedAdmin) {
    console.log("  [RESULT] Seed profile admin@shaastra.gov.in does NOT exist.");
    console.log("           The seed script has NOT been run, or the DB was reset.");
  } else {
    console.log("  [RESULT] Seed profile found:");
    console.log(JSON.stringify(seedAdmin, null, 2));
    const isSysAdmin = seedAdmin.role === "SYSTEM_ADMIN";
    const isVerified = seedAdmin.verificationStatus === "VERIFIED";
    console.log(`  [CHECK] Role is SYSTEM_ADMIN: ${isSysAdmin}`);
    console.log(`  [CHECK] verificationStatus is VERIFIED: ${isVerified}`);
    if (!isSysAdmin) {
      console.log("  [WARNING] Seed profile has role DISTRICT_AUTHORITY, NOT SYSTEM_ADMIN.");
      console.log("            This profile CANNOT approve other privileged users.");
    }
    if (!isVerified) {
      console.log("  [WARNING] Seed profile verificationStatus is NOT VERIFIED.");
    }
  }

  console.log("\n=== Summary ===");
  const verifiedSysAdmins = sysAdmins.filter(p => p.verificationStatus === "VERIFIED");
  const pendingSysAdmins = sysAdmins.filter(p => p.verificationStatus === "PENDING");
  console.log(`  SYSTEM_ADMIN total: ${sysAdmins.length}`);
  console.log(`  SYSTEM_ADMIN VERIFIED: ${verifiedSysAdmins.length}`);
  console.log(`  SYSTEM_ADMIN PENDING: ${pendingSysAdmins.length}`);

  if (verifiedSysAdmins.length === 0) {
    console.log("\n  [BOOTSTRAP PROBLEM CONFIRMED] There is no verified SYSTEM_ADMIN.");
    console.log("  The system cannot approve pending privileged users.");
  } else {
    console.log("\n  [OK] At least one verified SYSTEM_ADMIN exists. Bootstrap is not needed.");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
