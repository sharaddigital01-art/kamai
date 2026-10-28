-- Enable Row Level Security on all public tables created by Prisma.
-- The postgres / service_role users bypass RLS by default, so Prisma
-- (which connects as postgres) continues to work without any extra policies.
-- Supabase anon/authenticated callers will be blocked unless explicit
-- policies are added later.

-- Tables
ALTER TABLE "User"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayoutAccount"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerStore"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedLink"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Click"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EarningsLedger"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Withdrawal"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent"    ENABLE ROW LEVEL SECURITY;

-- PartnerStore and Deal are public catalog data — allow anonymous reads
CREATE POLICY "Allow public read on PartnerStore"
  ON "PartnerStore" FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on Deal"
  ON "Deal" FOR SELECT
  USING (true);

-- Authenticated users can read their own rows
CREATE POLICY "Users can read own profile"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can read own payout account"
  ON "PayoutAccount" FOR SELECT
  USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can manage own payout account"
  ON "PayoutAccount" FOR ALL
  USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can read own links"
  ON "GeneratedLink" FOR SELECT
  USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can insert own links"
  ON "GeneratedLink" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can read own clicks"
  ON "Click" FOR SELECT
  USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can read own earnings"
  ON "EarningsLedger" FOR SELECT
  USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can read own withdrawals"
  ON "Withdrawal" FOR SELECT
  USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can request own withdrawal"
  ON "Withdrawal" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId"::text);

-- WebhookEvent: server-only, no client access needed (no policy = blocked for anon/authenticated)
