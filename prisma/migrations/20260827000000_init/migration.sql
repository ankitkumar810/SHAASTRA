-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'SHELTER_ADMIN', 'DISTRICT_AUTHORITY', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "ShelterStatus" AS ENUM ('OPEN', 'LIMITED', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('RECEIVED', 'REVIEWED', 'VERIFIED', 'ACTIONED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReconnectionStatus" AS ENUM ('PENDING', 'MATCHED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "districtId" TEXT,
    "shelterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "zoneId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "availableBeds" INTEGER NOT NULL,
    "foodStockStatus" TEXT NOT NULL,
    "medicineStockStatus" TEXT NOT NULL,
    "waterStockStatus" TEXT,
    "status" "ShelterStatus" NOT NULL DEFAULT 'OPEN',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shelter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelterInventory" (
    "id" TEXT NOT NULL,
    "shelterId" TEXT NOT NULL,
    "foodDays" DOUBLE PRECISION NOT NULL,
    "medicineStatus" TEXT NOT NULL,
    "waterDays" DOUBLE PRECISION,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShelterInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelterUpdate" (
    "id" TEXT NOT NULL,
    "shelterId" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "occupiedBeds" INTEGER NOT NULL,
    "availableBeds" INTEGER NOT NULL,
    "foodStockStatus" TEXT NOT NULL,
    "medicineStockStatus" TEXT NOT NULL,
    "status" "ShelterStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShelterUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeRecord" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "shelterId" TEXT,
    "generalLocation" TEXT,
    "message" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "registeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconnectionRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterContact" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetDetails" TEXT,
    "status" "ReconnectionStatus" NOT NULL DEFAULT 'PENDING',
    "matchedRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisasterReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterName" TEXT,
    "reporterContact" TEXT,
    "hazardType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "zoneId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationName" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisasterReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "shelterId" TEXT,
    "districtId" TEXT,
    "icon" TEXT NOT NULL DEFAULT '⚠',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigneeId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePrediction" (
    "id" TEXT NOT NULL,
    "shelterId" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "predictedShortageAt" TIMESTAMP(3) NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourcePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");
CREATE INDEX "District_name_idx" ON "District"("name");

-- CreateIndex
CREATE INDEX "Zone_districtId_idx" ON "Zone"("districtId");
CREATE UNIQUE INDEX "Zone_districtId_name_key" ON "Zone"("districtId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
CREATE INDEX "Profile_role_idx" ON "Profile"("role");
CREATE INDEX "Profile_districtId_idx" ON "Profile"("districtId");
CREATE INDEX "Profile_shelterId_idx" ON "Profile"("shelterId");

-- CreateIndex
CREATE INDEX "Shelter_districtId_idx" ON "Shelter"("districtId");
CREATE INDEX "Shelter_zoneId_idx" ON "Shelter"("zoneId");
CREATE INDEX "Shelter_status_idx" ON "Shelter"("status");

-- CreateIndex
CREATE INDEX "ShelterInventory_shelterId_idx" ON "ShelterInventory"("shelterId");
CREATE INDEX "ShelterInventory_recordedAt_idx" ON "ShelterInventory"("recordedAt");

-- CreateIndex
CREATE INDEX "ShelterUpdate_shelterId_idx" ON "ShelterUpdate"("shelterId");
CREATE INDEX "ShelterUpdate_updatedById_idx" ON "ShelterUpdate"("updatedById");
CREATE INDEX "ShelterUpdate_createdAt_idx" ON "ShelterUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "SafeRecord_fullName_idx" ON "SafeRecord"("fullName");
CREATE INDEX "SafeRecord_shelterId_idx" ON "SafeRecord"("shelterId");
CREATE INDEX "SafeRecord_phone_idx" ON "SafeRecord"("phone");

-- CreateIndex
CREATE INDEX "ReconnectionRequest_targetName_idx" ON "ReconnectionRequest"("targetName");
CREATE INDEX "ReconnectionRequest_requesterId_idx" ON "ReconnectionRequest"("requesterId");
CREATE INDEX "ReconnectionRequest_status_idx" ON "ReconnectionRequest"("status");

-- CreateIndex
CREATE INDEX "DisasterReport_districtId_idx" ON "DisasterReport"("districtId");
CREATE INDEX "DisasterReport_zoneId_idx" ON "DisasterReport"("zoneId");
CREATE INDEX "DisasterReport_status_idx" ON "DisasterReport"("status");
CREATE INDEX "DisasterReport_hazardType_idx" ON "DisasterReport"("hazardType");

-- CreateIndex
CREATE INDEX "Alert_shelterId_idx" ON "Alert"("shelterId");
CREATE INDEX "Alert_districtId_idx" ON "Alert"("districtId");
CREATE INDEX "Alert_status_idx" ON "Alert"("status");
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "ResourcePrediction_shelterId_idx" ON "ResourcePrediction"("shelterId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelter" ADD CONSTRAINT "Shelter_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelter" ADD CONSTRAINT "Shelter_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelterInventory" ADD CONSTRAINT "ShelterInventory_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelterUpdate" ADD CONSTRAINT "ShelterUpdate_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelterUpdate" ADD CONSTRAINT "ShelterUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeRecord" ADD CONSTRAINT "SafeRecord_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeRecord" ADD CONSTRAINT "SafeRecord_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconnectionRequest" ADD CONSTRAINT "ReconnectionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconnectionRequest" ADD CONSTRAINT "ReconnectionRequest_matchedRecordId_fkey" FOREIGN KEY ("matchedRecordId") REFERENCES "SafeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisasterReport" ADD CONSTRAINT "DisasterReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisasterReport" ADD CONSTRAINT "DisasterReport_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisasterReport" ADD CONSTRAINT "DisasterReport_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisasterReport" ADD CONSTRAINT "DisasterReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePrediction" ADD CONSTRAINT "ResourcePrediction_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
