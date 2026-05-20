# DuePulse

Next.js 14 App Router + TypeScript + Tailwind + Supabase + D3.js.
Stack rules → docs/RULES.md
Design system → docs/DESIGN.md
Build progress → docs/PROGRESS.md
Completed sessions → docs/DONE.md
Schema → supabase/schema.sql

## Known Tech Debt

### Timezone (fix post-launch, v1.1)

productive_windows stores LOCAL hours (browser's getHours()).
Nudge engine in triggers/nudge-engine.ts uses hardcoded CDT offset (-5).
Fix: add `timezone text DEFAULT 'America/Chicago'` to profiles table,
capture via Intl.DateTimeFormat().resolvedOptions().timeZone in OnboardingWizard Step 2,
then use per-user timezone in nudge engine instead of hardcoded -5.
Affects users outside Central timezone only.
