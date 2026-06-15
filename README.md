# DuePulse

Canvas-synced student assignment planner with AI-generated push nudges and D3 workload visualizations.

## Features

- **Canvas Sync** — Pulls assignments and due dates from Canvas LMS
- **AI Nudges** — NVIDIA NIM + Mistral Large generates friendly push notification reminders
- **Smart Timing** — Learns your productive windows and nudges when you're likely to act
- **Workload Charts** — D3 heatmap and productive windows visualization
- **Push Notifications** — Cross-browser Web Push with VAPID auth
- **PWA** — Installable on mobile, works offline
- **Background Jobs** — Trigger.dev hourly nudge engine

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · Supabase (Postgres + Auth) · D3.js · Zustand · Trigger.dev · Upstash Redis · NVIDIA NIM · Zod

## Quick Start

```bash
git clone https://github.com/sthakri/duepulse.git
cd duepulse
npm install
npm run dev
```

### Environment Variables

Create `.env.local` in the project root. Key ones:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `CANVAS_PERSONAL_TOKEN` | Canvas API token |
| `CANVAS_DOMAIN` | e.g. `txstate.instructure.com` |
| `NIM_API_KEY` | NVIDIA NIM API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `TRIGGER_SECRET_KEY` | Trigger.dev project key |
| `NUDGE_ENABLED` | `"true"` to enable nudge engine |

Run `npm run dev` and open `http://localhost:3000`.

### Database

Run `supabase/schema.sql` in your Supabase SQL editor to create all tables, RLS policies, and indexes.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (webpack) |
| `npm run build` | Production build (webpack) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deploy

1. Push to GitHub and connect to Vercel
2. Set all env vars in Vercel Dashboard
3. Deploy Trigger.dev jobs: `npx trigger.dev@latest deploy`
4. Set `NUDGE_ENABLED=true` and enable the Trigger.dev schedule
