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
- [ ] **Migration: overdue nudge type** — Run `supabase/migrations/20260816_overdue_nudge_type.sql` on production

### Key Rotation

If `ENCRYPTION_KEY` needs to change:
1. Set the new key as `ENCRYPTION_KEY` in env
2. Set the old key as `ENCRYPTION_KEY_PREVIOUS` in env
3. Update `crypto.ts` to try decrypt with new key first, fall back to old key
4. Run the migration script to re-encrypt with new key
5. Remove `ENCRYPTION_KEY_PREVIOUS` once all tokens are migrated

## Upcoming Sessions (v1.1 — post-launch)

- Session 17: Soft Launch Prep + Analytics
