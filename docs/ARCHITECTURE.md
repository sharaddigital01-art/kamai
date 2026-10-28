# Architecture blueprint

Four lenses on one product. (These are analysis perspectives, not separate running agents.)
Sources: EarnKaro's **public** landing page plus your brief. The logged-in app is behind login and was
**not** inspected; the dashboard, wallet and payout flows here are designed from the brief, not copied.

## 1. UI / UX and design system

- **Hierarchy:** hero with the paste field *as* the primary action → partner stores → category chips + filters → deal grid.
- **Two accents, two jobs:** saffron orange = *do something* (Make Link, discount badge); leaf green = *your money* (profit tags, balances). Never swapped.
- **Type:** Bricolage Grotesque (display, numbers) + Figtree (body); tabular numerals (`.num`) for all money.
- **Mobile first:** bottom nav with a raised Make Link button, bottom-sheet modal on phones / centred dialog on desktop, horizontally scrolling chip rows, 44px+ touch targets, safe-area insets.
- **Modules:** `Navbar`, `MobileBottomNav`, `HeroPaste`, `StoreStrip`, `CategoryFilter`, `DealFeed`/`DealCard`, `MakeLinkModal`, `EarningsSummary`, `LedgerTable`, `WithdrawButton`, `PayoutForm`.

## 2. Core workflows

**Make Link** (`POST /api/links`)
```
paste ─► extractUrl ─► validate (https, no userinfo/port, ASCII host, allow-listed domain)
      ─► [short link? expand ≤3 hops, only allow-listed redirector hosts]
      ─► canonicalise (strip utm_*/foreign aff params, sort params, normalise host)
      ─► idempotency check (userId + sha256(canonical))
      ─► mint 8-char code ─► subId = user.subIdPrefix + code
      ─► destination = Flipkart: ?affid=&affExtParam1=subId | Myntra/Ajio: network deeplink template
      ─► save ─► https://host/r/<code>
```
**Click** (`GET /r/:code`): cached lookup → 302 to stored destination (`no-store`) → click recorded *after* the response (`after()`), bots logged but not counted, IPs stored only as daily-salted hashes.

**Earnings lifecycle**
```
postback ─► PENDING ─► CONFIRMED ─(withdrawal claims row)─► PAID
               └──────────┴──► REJECTED          Withdrawal: REQUESTED → PROCESSING → PAID | FAILED(releases rows)
```
Attribution: postback `sub_id` → `GeneratedLink.subId` → user. One ledger row per order line, unique on (store, order, item), so retries and replays are harmless. Withdrawals claim all available rows with a single atomic `UPDATE`; a concurrent request claims nothing and rolls back.

## 3. Data and API

Entities: `User` (id = Supabase auth id), `PayoutAccount`, `PartnerStore` (commission + user-share in bps), `Deal`, `GeneratedLink`, `Click`, `EarningsLedger`, `Withdrawal`, `WebhookEvent`. Money = integer paise.

Profit shown on a card = price × store commission × user share (precomputed into `Deal.estimatedProfitPaise` so it can be sorted in SQL). Real profit always comes from the store's postback.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/links` `{url, dealId?}` | user | Create/return short link. 401, 422 (bad/unsupported URL), 429, 503 (store not configured) |
| `GET /r/:code` | none | Redirect + click tracking |
| `GET /api/deals?q&store&category&minDiscount&minPrice&maxPrice&sort&page&limit` | none | Deal feed (cached 30s at CDN) |
| `POST /api/postback/:store` | HMAC `x-signature` | Conversion events `{order_id,item_id?,sub_id,status,order_amount,commission}` |
| `POST /api/withdrawals` | user | Claim available balance (min ₹10, payout account required) |
| `PATCH /api/admin/withdrawals/:id` `{action}` | ADMIN | `process` / `paid{utr}` / `failed{reason}` |

## 4. Stack and performance

- **Next.js 15 App Router.** Page 1 of the feed is server-rendered; TanStack Query handles "load more"; Zustand holds only the global Make Link modal state; Radix Dialog for accessibility.
- **Supabase:** Auth (verified server-side with `getUser()`), Postgres, Realtime. RLS denies browser access by default; users may only *read* their own links/ledger/withdrawals. Every write is server-side via Prisma.
- **Hot path = `/r/:code`:** excluded from the auth middleware, in-memory cache (60s), tracking deferred. Scaling plan: Redis for the link cache and rate limits; move clicks to a queue/stream if volume demands; partition `Click` by month.
- **Indexes** match the feed's sorts: `(isActive, discountPct|estimatedProfitPaise|clickCount|createdAt desc)`, plus store/category. Add `pg_trgm` for fast title search (commented in `post-migrate.sql`).

### Deal ingestion (not built)
Real deals need a source: Flipkart's affiliate product feed/API, your network's coupon/offer feeds, or an admin form. Write a job that upserts on `(storeId, externalId)` and recomputes `discountPct` and `estimatedProfitPaise`, and deactivates expired items.

## Security checklist (implemented)
Allow-listed hosts only (no open redirect; short-link expansion can't be pointed at arbitrary hosts) · look-alike/IDN domains rejected · HMAC-verified, constant-time postbacks with replay log · idempotent ledger · RLS deny-by-default · `?next=` login redirects restricted to same-site paths · daily-salted IP hashes · per-user rate limits.

## Still on you
Encrypt bank account numbers · Redis-backed rate limits for multi-instance · fraud rules (self-clicks, click farms) · KYC/tax/DPDP compliance · observability and alerting on postback failures.
