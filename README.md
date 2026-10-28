# Kamai

An affiliate deal-sharing platform in the style of EarnKaro: paste a product link, get a short trackable
profit link, share it, and earn when someone buys. Next.js (App Router) · TypeScript · Tailwind · Prisma ·
Supabase (Auth + Postgres + Realtime).

> **Kamai is a placeholder brand.** Nothing here copies EarnKaro's logo, copy or assets. Rename freely.

## What's inside

| Area | Where |
|---|---|
| Link engine (parse, validate, canonicalise, inject affiliate id + sub-id) | `src/lib/linkConverter.ts` (+ 23 tests) |
| Schema (users, stores, deals, links, clicks, ledger, withdrawals) | `prisma/schema.prisma` |
| Short-link redirect + click tracking | `src/app/r/[code]/route.ts` |
| Make Link API (idempotent, rate-limited) | `src/app/api/links/route.ts` |
| Deals feed (filters, sorting, pagination) | `src/lib/deals.ts`, `src/app/api/deals/route.ts` |
| Earnings state machine + withdrawals | `src/lib/ledger.ts` |
| Conversion postback webhook (HMAC, replay-safe) | `src/app/api/postback/[store]/route.ts` |
| UI | `src/components/*` (Navbar, MobileBottomNav, MakeLinkModal, DealCard, CategoryFilter, DealFeed, earnings) |
| RLS + realtime + DB constraints | `supabase/post-migrate.sql` |
| Full blueprint | `docs/ARCHITECTURE.md` |

## Run it

```bash
npm install
cp .env.example .env.local          # fill in Supabase + affiliate values
npx prisma db push                  # create tables
# then paste supabase/post-migrate.sql into the Supabase SQL editor
npm run db:seed                     # 3 stores + 12 placeholder deals
npm run dev                         # http://localhost:3000
npm test                            # link engine tests
```

**Supabase setup:** enable Email auth. For OTP codes (not magic links), edit the *Magic Link* email
template to include `{{ .Token }}`. Phone OTP also works (`signInWithOtp({ phone })`) but needs an SMS
provider such as Twilio.

## Before you can earn a rupee (not code)

1. **Get approved.** Flipkart Affiliate for Flipkart; an affiliate network that carries Myntra and Ajio.
   Read each programme's terms: some restrict how links may be shared or modified.
2. **Verify the URL parameters.** `affid` / `affExtParam1` (Flipkart) and the short-link hosts (`fkrt.it`,
   `myntr.it`) in `STORE_RULES` are my best knowledge, not verified against your accounts. Check them in
   your dashboards. For Myntra/Ajio paste your network's deeplink pattern into the env vars.
3. **Wire postbacks.** Point each programme's conversion report/postback at
   `POST /api/postback/<store>`. If it can't sign requests, put a small adapter in front that does.
4. **Replace seed deals** with real products (see `docs/ARCHITECTURE.md` → Deal ingestion).
5. **Payout compliance.** KYC, tax deduction and consumer-data obligations (India's DPDP Act) apply once you
   pay real people. Talk to an accountant/lawyer. Encrypt any bank account numbers at rest.

## What has and hasn't been verified

Verified in the build sandbox: strict TypeScript, `prisma validate`, 23 unit tests for the link engine
(including look-alike domains, userinfo tricks, SSRF-safe short-link expansion), and a production
`next build` of all routes. **Not verified:** anything touching a real Postgres/Supabase, a real
affiliate account, or a browser. Run the flow end to end once with test data before trusting money paths.

## Known limits

- Rate limiter and link cache are in-memory (per instance). Swap in Redis before scaling horizontally.
- Auth is email OTP only; payout is UPI only (schema already supports bank accounts).
- Rejecting an order that a withdrawal already claimed is reported (`locked_by_withdrawal`), never automatic.
