-- Run once in the Supabase SQL editor AFTER `prisma db push` / `prisma migrate`.
-- Prisma connects with the database owner role (bypasses RLS). These policies only govern what the
-- browser (anon/authenticated keys via PostgREST + Realtime) can see. Default for every table: deny.

-- ---- 1. Lock everything down ------------------------------------------------
alter table "User"           enable row level security;
alter table "PayoutAccount"  enable row level security;
alter table "PartnerStore"   enable row level security;
alter table "Deal"           enable row level security;
alter table "GeneratedLink"  enable row level security;
alter table "Click"          enable row level security;
alter table "EarningsLedger" enable row level security;
alter table "Withdrawal"     enable row level security;
alter table "WebhookEvent"   enable row level security;

-- ---- 2. Read-only access for signed-in users to THEIR OWN rows ---------------
-- User.id = auth.users.id, so auth.uid() compares directly.
create policy "own profile"     on "User"           for select to authenticated using (auth.uid() = "id");
create policy "own links"       on "GeneratedLink"  for select to authenticated using (auth.uid() = "userId");
create policy "own ledger"      on "EarningsLedger" for select to authenticated using (auth.uid() = "userId");
create policy "own withdrawals" on "Withdrawal"     for select to authenticated using (auth.uid() = "userId");

-- Public catalogue (no sensitive columns)
create policy "public stores" on "PartnerStore" for select to anon, authenticated using ("status" = 'ACTIVE');
create policy "public deals"  on "Deal"         for select to anon, authenticated using ("isActive" = true);

-- PayoutAccount, Click, WebhookEvent: no policy = no browser access (server only).
-- No INSERT/UPDATE/DELETE policies anywhere: every write goes through the server.

-- ---- 3. Realtime for the live earnings screen --------------------------------
alter publication supabase_realtime add table "EarningsLedger";
alter publication supabase_realtime add table "Withdrawal";

-- ---- 4. Money invariants the app also enforces, as a safety net --------------
alter table "Withdrawal"     add constraint withdrawal_amount_nonneg check ("amountPaise" >= 0);
alter table "EarningsLedger" add constraint ledger_amounts_nonneg   check ("orderAmountPaise" >= 0 and "commissionPaise" >= 0);
-- A row can only belong to a withdrawal while CONFIRMED or PAID:
alter table "EarningsLedger" add constraint ledger_withdrawal_status
  check ("withdrawalId" is null or "status" in ('CONFIRMED', 'PAID'));

-- ---- 5. Fast "search deals by title" (optional) -------------------------------
-- create extension if not exists pg_trgm;
-- create index deal_title_trgm on "Deal" using gin ("title" gin_trgm_ops);
