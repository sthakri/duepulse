# Stack Rules — Non-Negotiable

- Next.js 14 App Router only. Never /pages directory.
- TypeScript strict mode. No `any` type ever.
- Tailwind CSS only. No inline styles. No CSS modules.
  Exception: dynamic values (e.g. course_color border) may use inline style.
- Supabase: @supabase/ssr only. Server client in Server Components/API routes.
  Browser client in Client Components only.
- D3.js for ALL charts. Never Recharts. Never Chart.js.
- web-push for notifications. Never FCM or OneSignal.
- AI (NVIDIA NIM) via Vercel AI SDK only. Use generateText() or streamText() from 'ai'.
  Never import the provider client directly — always use lib/nim.ts.
- Background jobs via Trigger.dev only. Never raw cron routes for long tasks.
- Client state via Zustand only. No React Context for global state.
- Rate limiting via @upstash/ratelimit on all external API routes.
- All env vars validated via lib/env.ts (@t3-oss/env-nextjs + zod).
  Never access process.env directly — always import from lib/env.ts.
- shadcn/ui components live in components/ui/ only. Never modify them.
- RLS enabled on every Supabase table. No exceptions.
- Never hardcode 'localhost' — use relative URLs for all API calls.
