-- Enable Row Level Security on all core SHAASTRA tables

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shelter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShelterInventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShelterUpdate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SafeRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReconnectionRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DisasterReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- 1. PROFILE POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON "Profile";
CREATE POLICY "Users can view own profile" ON "Profile"
  FOR SELECT USING (auth.uid()::text = id OR EXISTS (
    SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.role IN ('DISTRICT_AUTHORITY', 'SYSTEM_ADMIN')
  ));

DROP POLICY IF EXISTS "Users can update own profile details" ON "Profile";
CREATE POLICY "Users can update own profile details" ON "Profile"
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- 2. SHELTER POLICIES
DROP POLICY IF EXISTS "Public can view shelters" ON "Shelter";
CREATE POLICY "Public can view shelters" ON "Shelter"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Shelter admin update assigned shelter" ON "Shelter";
CREATE POLICY "Shelter admin update assigned shelter" ON "Shelter"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid()::text
        AND (p."shelterId" = "Shelter".id OR p.role IN ('DISTRICT_AUTHORITY', 'SYSTEM_ADMIN'))
    )
  );

-- 3. SAFE RECORD POLICIES
DROP POLICY IF EXISTS "Public can submit safe record" ON "SafeRecord";
CREATE POLICY "Public can submit safe record" ON "SafeRecord"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Controlled safe record lookup" ON "SafeRecord";
CREATE POLICY "Controlled safe record lookup" ON "SafeRecord"
  FOR SELECT USING ("isPrivate" = false OR auth.uid()::text = "registeredById");

-- 4. DISASTER REPORT POLICIES
DROP POLICY IF EXISTS "Citizens can submit disaster reports" ON "DisasterReport";
CREATE POLICY "Citizens can submit disaster reports" ON "DisasterReport"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authorities can view all reports" ON "DisasterReport";
CREATE POLICY "Authorities can view all reports" ON "DisasterReport"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid()::text AND p.role IN ('DISTRICT_AUTHORITY', 'SYSTEM_ADMIN')
    )
  );

-- 5. ALERT POLICIES
DROP POLICY IF EXISTS "Public can view active alerts" ON "Alert";
CREATE POLICY "Public can view active alerts" ON "Alert"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authorities can manage alerts" ON "Alert";
CREATE POLICY "Authorities can manage alerts" ON "Alert"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid()::text AND p.role IN ('DISTRICT_AUTHORITY', 'SYSTEM_ADMIN')
    )
  );
