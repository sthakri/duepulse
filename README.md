# DuePulse

A smart assignment planner for students who use Canvas LMS. DuePulse syncs your Canvas assignments, learns when you're most productive, and sends AI-generated push notifications to keep you on track — without the noise.

## What It Does

Most assignment trackers just show a list of due dates. DuePulse goes further:

- **Syncs with Canvas** — Connect your Canvas account once. Assignments, due dates, and course info are pulled automatically.
- **Tracks your focus patterns** — Every time you open DuePulse, it records when you're studying. Over time it builds a model of your productive windows.
- **Sends smart nudges** — Using NVIDIA NIM + Mistral Large, it generates friendly, personalized push notifications at the right time. Not spam — just a gentle "hey, that calc assignment is due tonight" when you're likely to act on it.
- **Shows your workload visually** — D3-based heatmaps and charts help you see busy weeks at a glance.
- **Works as a PWA** — Install it on your phone or desktop. Works offline.

## How It Works

```
Canvas API → Supabase DB → Nudge Engine (Trigger.dev) → Web Push
                ↓
          D3 Charts & Dashboard
```

1. You connect your Canvas account during onboarding.
2. DuePulse fetches your courses and assignments via the Canvas API.
3. Every time you visit, your productive window data is recorded.
4. A background job (Trigger.dev) runs hourly — it checks deadlines, your focus patterns, and sends AI-generated nudges when appropriate.
5. You see everything on a dashboard with workload heatmaps and insights.

## Built With

Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · D3.js · NVIDIA NIM (Mistral Large) · Web Push API · Zustand · Trigger.dev · Upstash Redis

## Getting Started

```bash
git clone https://github.com/sthakri/duepulse.git
cd duepulse
npm install
```

Create `.env.local` with your credentials (Supabase, Canvas token, NVIDIA NIM key, VAPID keys, Upstash Redis, Trigger.dev). See [docs/setup.md](docs/setup.md) for full details.

Run `supabase/schema.sql` in your Supabase SQL editor, then:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/             # Next.js App Router (pages + API routes)
│   ├── api/         # Backend endpoints (sync, push, nudge)
│   └── dashboard/   # Main app pages
├── components/      # React components (charts, forms, buttons)
├── lib/             # Business logic (Supabase clients, AI, store)
└── trigger/         # Trigger.dev background job
```

## Deploy

Connect your fork to Vercel, set env vars, then deploy the Trigger.dev job (`npx trigger.dev@latest deploy`) and set `NUDGE_ENABLED=true`.
