-- Phase 4 RLS: GPS Consent, Missing Persons, Incidents
-- Run after prisma db push has created the tables

-- LocationConsent: only owner can insert/update their own consent; authorities can SELECT
ALTER TABLE "LocationConsent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own location consent" ON "LocationConsent";
CREATE POLICY "Users can manage own location consent" ON "LocationConsent"
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Authorities can view location consents" ON "LocationConsent";
CREATE POLICY "Authorities can view location consents" ON "LocationConsent"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid()::text
        AND p.role IN ('DISTRICT_AUTHORITY', 'SYSTEM_ADMIN')
        AND p."verificationStatus" = 'VERIFIED'
    )
  );

-- MissingPerson: public can submit and read non-sensitive fields; authorities see full record
ALTER TABLE "MissingPerson" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit missing person report" ON "MissingPerson";
CREATE POLICY "Public can submit missing person report" ON "MissingPerson"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view missing person reports" ON "MissingPerson";
CREATE POLICY "Public can view missing person reports" ON "MissingPerson"
  FOR SELECT USING (true);
-- NOTE: Precise lat/lng is stripped at the API layer for non-authority callers; RLS permits read
-- but the Next.js API route enforces field-level authorization.

DROP POLICY IF EXISTS "Authorities can update missing person status" ON "MissingPerson";
CREATE POLICY "Authorities can update missing person status" ON "MissingPerson"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid()::text
        AND p.role IN ('DISTRICT_AUTHORITY', 'SYSTEM_ADMIN')
        AND p."verificationStatus" = 'VERIFIED'
    )
  );

-- Incident: fully public read; server-side only writes (Prisma via service role or seed)
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view incidents" ON "Incident";
CREATE POLICY "Public can view incidents" ON "Incident"
  FOR SELECT USING (true);

-- Note: INSERT/UPDATE on Incident is done via Prisma server-side only (seed script, future ingestion)
-- No client-facing INSERT policy is intentionally created.
