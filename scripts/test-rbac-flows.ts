import { sanitizeRole, getDashboardPathForRole, syncUserProfile } from "../lib/services/auth";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING RBAC & VERIFICATION FLOW TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Role Sanitization & Initial Status Rules
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 1] Role Sanitization Logic");

  const citizenSanitized = sanitizeRole("CITIZEN");
  assert(
    citizenSanitized.role === "CITIZEN" && citizenSanitized.verificationStatus === "VERIFIED",
    "Citizen role is sanitized to CITIZEN with VERIFIED status"
  );

  const shelterAdminSanitized = sanitizeRole("SHELTER_ADMIN");
  assert(
    shelterAdminSanitized.role === "SHELTER_ADMIN" && shelterAdminSanitized.verificationStatus === "PENDING",
    "Shelter Admin role is sanitized to SHELTER_ADMIN with PENDING status"
  );

  const districtAuthSanitized = sanitizeRole("DISTRICT_AUTHORITY");
  assert(
    districtAuthSanitized.role === "DISTRICT_AUTHORITY" && districtAuthSanitized.verificationStatus === "PENDING",
    "District Authority role is sanitized to DISTRICT_AUTHORITY with PENDING status"
  );

  const sysAdminSanitized = sanitizeRole("SYSTEM_ADMIN");
  assert(
    sysAdminSanitized.role === "SYSTEM_ADMIN" && sysAdminSanitized.verificationStatus === "PENDING",
    "System Admin role is sanitized to SYSTEM_ADMIN with PENDING status"
  );

  const defaultSanitized = sanitizeRole(undefined);
  assert(
    defaultSanitized.role === "CITIZEN" && defaultSanitized.verificationStatus === "VERIFIED",
    "Default/Unknown role is sanitized to CITIZEN with VERIFIED status"
  );

  // -------------------------------------------------------------
  // TEST 2: Verified Portal Routing
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 2] Portal Routing for Verified Roles");

  assert(getDashboardPathForRole("CITIZEN") === "/dashboard/citizen", "CITIZEN routes to /dashboard/citizen");
  assert(getDashboardPathForRole("SHELTER_ADMIN") === "/dashboard/shelter", "SHELTER_ADMIN routes to /dashboard/shelter");
  assert(getDashboardPathForRole("DISTRICT_AUTHORITY") === "/dashboard/authority", "DISTRICT_AUTHORITY routes to /dashboard/authority");
  assert(getDashboardPathForRole("SYSTEM_ADMIN") === "/dashboard/admin", "SYSTEM_ADMIN routes to /dashboard/admin");

  // -------------------------------------------------------------
  // TEST 3: End-to-End Database Sync & Approval Simulation for 4 Roles
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 3] Database Sync, Verification Status & Admin Approval Lifecycle");

  const timestamp = Date.now();

  // 1. Citizen Flow
  const citizenId = `test-citizen-${timestamp}`;
  const citizenProfile = await syncUserProfile({
    id: citizenId,
    email: `citizen-${timestamp}@example.com`,
    fullName: "Citizen Test User",
    requestedRole: "CITIZEN",
    districtName: "Ernakulam",
  });

  assert(
    citizenProfile !== null &&
    citizenProfile.role === "CITIZEN" &&
    citizenProfile.verificationStatus === "VERIFIED",
    "Flow 1 (Citizen): Registered and created with VERIFIED status immediately"
  );

  // 2. Shelter Administrator Flow
  const shelterAdminId = `test-shelter-admin-${timestamp}`;
  const shelterProfile = await syncUserProfile({
    id: shelterAdminId,
    email: `shelter-${timestamp}@example.com`,
    fullName: "Shelter Admin Test User",
    requestedRole: "SHELTER_ADMIN",
    districtName: "Ernakulam",
  });

  assert(
    shelterProfile !== null &&
    shelterProfile.role === "SHELTER_ADMIN" &&
    shelterProfile.verificationStatus === "PENDING",
    "Flow 2 (Shelter Admin): Registered with PENDING verification status (lands in verification pending)"
  );

  // Admin approves shelter admin
  const approvedShelter = await prisma.profile.update({
    where: { id: shelterAdminId },
    data: { verificationStatus: "VERIFIED" },
  });

  assert(
    approvedShelter.verificationStatus === "VERIFIED" &&
    getDashboardPathForRole(approvedShelter.role) === "/dashboard/shelter",
    "Flow 2 (Shelter Admin): After admin approval, status is VERIFIED and routes to Shelter Admin portal"
  );

  // 3. District Authority Flow
  const districtAuthId = `test-district-auth-${timestamp}`;
  const authProfile = await syncUserProfile({
    id: districtAuthId,
    email: `authority-${timestamp}@example.com`,
    fullName: "District Authority Test User",
    requestedRole: "DISTRICT_AUTHORITY",
    districtName: "Ernakulam",
  });

  assert(
    authProfile !== null &&
    authProfile.role === "DISTRICT_AUTHORITY" &&
    authProfile.verificationStatus === "PENDING",
    "Flow 3 (District Authority): Registered with PENDING verification status (lands in verification pending)"
  );

  // Admin approves district authority
  const approvedAuth = await prisma.profile.update({
    where: { id: districtAuthId },
    data: { verificationStatus: "VERIFIED" },
  });

  assert(
    approvedAuth.verificationStatus === "VERIFIED" &&
    getDashboardPathForRole(approvedAuth.role) === "/dashboard/authority",
    "Flow 3 (District Authority): After admin approval, status is VERIFIED and routes to District Command portal"
  );

  // 4. System Administrator Flow
  const sysAdminId = `test-sys-admin-${timestamp}`;
  const sysAdminProfile = await syncUserProfile({
    id: sysAdminId,
    email: `sysadmin-${timestamp}@example.com`,
    fullName: "System Admin Test User",
    requestedRole: "SYSTEM_ADMIN",
    districtName: "Ernakulam",
  });

  assert(
    sysAdminProfile !== null &&
    sysAdminProfile.role === "SYSTEM_ADMIN" &&
    sysAdminProfile.verificationStatus === "PENDING",
    "Flow 4 (System Admin): Registered with PENDING verification status (lands in verification pending)"
  );

  // Admin approves system admin
  const approvedSysAdmin = await prisma.profile.update({
    where: { id: sysAdminId },
    data: { verificationStatus: "VERIFIED" },
  });

  assert(
    approvedSysAdmin.verificationStatus === "VERIFIED" &&
    getDashboardPathForRole(approvedSysAdmin.role) === "/dashboard/admin",
    "Flow 4 (System Admin): After admin approval, status is VERIFIED and routes to System Admin portal"
  );

  // Clean up test records
  await prisma.profile.deleteMany({
    where: {
      id: { in: [citizenId, shelterAdminId, districtAuthId, sysAdminId] },
    },
  });

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
