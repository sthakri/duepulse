# Build Progress

## Production Readiness — Completed

All critical and required fixes from the production-readiness audit have been implemented:

### Code Fixes (Session 16–17)
- C1: Canvas token AES-256-GCM encryption at rest (`src/lib/crypto.ts`)
- C2: Zod input validation on all API routes (`src/lib/validations.ts`)
- R1: Removed duplicate `/api/auth/callback` route
- R2: Fixed nudge/test gate (404 in prod instead of dev-only check)
- R3: Onboarding auth guard + removed from PUBLIC_PATHS
- R4: Removed unused `userId`/`timezone` props from ProductiveWindowTracker + AssignmentsClient
- R5: AutoSync 5-min cooldown on visibility change
- R6: Removed dead `userId` from SyncNowButton request body
- R7: Documented `numeric(4,3)` precision in schema

### Infrastructure Fixes (Session 17)
- P1: RLS audit — added missing `push_subscriptions` update policy + `nudge_logs` insert/update/delete
- P2: Token re-encryption migration ran on Supabase (all plaintext tokens now encrypted)
- P3: Strong `ENCRYPTION_KEY` (32-byte base64 random) in `.env.local`
- P4: Nudge-engine service role verified correct (bypasses RLS for cross-user queries)
- P5: Vitest + 19 smoke tests for crypto + validation modules
- P6: `.gitignore` verified — `.env.local` never committed to git history
- P7: Error boundaries (`error.tsx`) at root + dashboard layout; loading state at dashboard
- P8: SQL migration for RLS policies executed on Supabase

### Session 18 — PWA, Assignments Window, Nudge Engine Extensions
- **PWA Install Detection** — Fixed iPadOS 13+ detection (Mac UA + touch) in `MobileBrowserGate`, `MobileInstallGuide`, `/install` page; standalone PWA mode shows "already installed" state
- **Assignments 2-Week Window** — Server-side filter (past 14d + next 14d) on `/dashboard/assignments` and dashboard heatmap/stats; null-due-date assignments preserved
- **Auto-Cleanup Completed** — Nudge engine Section C deletes `is_completed=true` assignments older than 5 days; `nudge_logs` cascade via FK
- **Overdue Reminder Nudges** — New `overdue` nudge type (once per 24h per assignment); fires even in minimal mode; quiet hours + pause respected
- **Tests** — 11 new unit tests for window predicates, cleanup cutoff, overdue selection (31 total pass)
- **Manual E2E Verified** — Push subscribe, test notification, dev test routes (productive_window/overdue/12h), mobile install redirect, standalone bypass, 2-week window filter

### Pre-Launch Checklist

Before deploying to production, verify each item:

- [ ] **Environment variables** — All 14 vars in `.env.local` are set on the hosting platform (Vercel, etc.)
  - `ENCRYPTION_KEY`: Must be a **new** 32+ char cryptographically random key for production (not the dev key)
  - `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Generate fresh VAPID keys for the production domain
  - `NUDGE_ENABLED`: Set to `"true"` when ready for push notifications
  - All other vars: Copy from `.env.local` or generate new production values
- [ ] **Supabase RLS** — Run `supabase/migrations/20260627_rls_policies.sql` on the production database
- [ ] **Token migration** — Run `npx tsx supabase/migrate-encrypt-tokens.ts` after setting the production `ENCRYPTION_KEY`
- [ ] **Trigger.dev** — Deploy the nudge-engine job: `npx trigger.dev@latest deploy`
- [x] **Build passes** — `npm run build` completes with no errors ✓
- [x] **Tests pass** — `npm test` (31/31) completes with all tests passing ✓
- [x] **Lint passes** — `npm run lint` completes with no errors ✓
- [ ] **Auth redirect URLs** — Add production domain to Supabase Auth → URL Configuration → Redirect URLs
- [ ] **PWA manifest** — Update `start_url` and icons in `public/manifest.json` for production domain
- [ ] **VAPID keys** — If using a new domain, regenerate: `npx web-push generate-vapid-keys`
- [x] **Migration: overdue nudge type** — Applied to prod 2026-08-23 (`20260816_overdue_nudge_type.sql`). **This was missing and caused overdue pushes to resend every cron run** (send succeeded, log insert rejected by old CHECK constraint, error swallowed by Promise.allSettled).
- [x] **Migration: nudge_logs dedup index** — Applied to prod 2026-08-23 (`20260823_nudge_logs_dedup_nonpartial.sql`). Replaced partial unique index: PostgREST upserts cannot infer partial indexes as ON CONFLICT arbiters (error 42P10).
- [ ] **Trigger.dev redeploy** — Cron changed from hourly (`0 * * * *`) to every 15 min (`*/15 * * * *`); run `npx trigger.dev@latest deploy` for prod to pick it up.

### Session 19 — Notification timing & overdue dedup hardening

- **Cron frequency**: `0 * * * *` → `*/15 * * * *`; deadline nudges now land within ~15 min of intent (previously up to 60 min late).
- **Catch-up buckets** (`src/lib/deadline.ts`): 1h (≤90m) / 6h (≤7h) / 12h (≤13h); an assignment gets exactly the bucket containing its remaining time — late-synced assignments get a nudge instead of being skipped; no stale larger bucket fires after a smaller one.
- **Accurate wording**: notification title/body computed from actual remaining time ("Due in ~5 Hours ⚡", "…due in 45 minutes (by 6:30 PM)") — no more static "~6 hours" for a 5h-away deadline.
- **Per-user send decision**: Sections B and D now decide once per user (previously per subscription), then fan out to the user's devices — removes the multi-device dedup race, halves DB queries.
- **Claim-before-send**: nudge_logs claim written before the push; if every device send fails, the claim is released so the next run retries. Repeats are now impossible without a durable record.
- **Overdue wording** (`src/lib/nim.ts`): past-due assignments no longer say "due today" — "was due yesterday / N days ago / earlier today", with an overdue-specific prompt rule.
- **Timezone fallback**: server-side `getDefaultTimezone()` is now `America/Chicago` (was the machine's zone — UTC on Trigger.dev workers).
- **Prod DB fixes (applied)**: added `overdue` to `nudge_logs.nudge_type` CHECK; replaced partial `nudge_logs_dedup` index with non-partial.
- **Tests**: 18 new in `deadline.test.ts` (68 total pass).

### Session 19b — Security hardening (from audit)

- **Timezone poisoning fix (was HIGH)**: one malformed `profiles.timezone` (writable via RLS) could crash the entire nudge engine run loop for all users. Fixed in 3 layers: `coerceTimezone()` guards every engine read; `timezoneSchema` (Intl-validated) in `saveNotificationSettings`; DB CHECK `profiles_timezone_shape` (regex) — applied to prod 2026-08-23.
- **`/api/nudge/test` now fails CLOSED** (404 unless `NODE_ENV === "development"`; previously default-on when env unset).
- **Server actions hardened**: quiet hours validated 0–23, `nudge_frequency` allowlisted, pause hours clamped ≤720 (Infinity crash), generic error messages (no raw PostgREST errors to client).
- **Rate limits**: `/api/canvas/encrypt` got its missing limiter (10/h); all routes now use distinct Redis prefixes (previously shared one budget per user).
- **Prompt hygiene**: assignment/course names sanitized (control/bidi chars stripped, 120-char cap) before NIM prompts.
- **Headers + PWA**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on all routes; removed `/api/*` from service-worker runtime cache (authed responses no longer persist per-user data on shared devices).
- **Service worker**: push handler no longer crashes on non-JSON payloads.
- **Deps**: Next 16.2.6 → **16.3.2** (patches reachable Server-Actions DoS); `@trigger.dev/sdk/build` → 4.5.12; `ws` forced ≥ 8.21.3 via override (patches DoS/memory advisories). Remaining audit noise: `next-pwa` build-time `serialize-javascript` (replace next-pwa post-launch), OTel baggage DoS inside trigger.dev tree.
- **`CRON_SECRET`** marked optional (unused legacy); `ENCRYPTION_KEY` schema pinned to base64-of-32-bytes (derivation MUST stay byte-stable — see crypto.ts comment).
- **Deferred**: push subscription ownership check on endpoint reuse (shared-device edge); unsubscribe/DELETE route + "disable on this device" UI; full CSP header.

### Key Rotation

If `ENCRYPTION_KEY` needs to change:
1. Set the new key as `ENCRYPTION_KEY` in env
2. Set the old key as `ENCRYPTION_KEY_PREVIOUS` in env
3. Update `crypto.ts` to try decrypt with new key first, fall back to old key
4. Run the migration script to re-encrypt with new key
5. Remove `ENCRYPTION_KEY_PREVIOUS` once all tokens are migrated

## Upcoming Sessions (v1.1 — post-launch)

- Session 17: Soft Launch Prep + Analytics
