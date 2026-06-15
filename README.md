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

## Project Structure

```
duepulse/
├── public/                    # Static assets
│   ├── icons/                 # PWA install icons
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Login + onboarding pages
│   │   ├── api/               # Backend API routes
│   │   │   ├── canvas/        # Canvas LMS sync + test
│   │   │   ├── nudge/         # AI nudge generation (dev)
│   │   │   ├── push/          # Web Push subscribe + test
│   │   │   └── stress/        # Workload stress prediction
│   │   ├── auth/              # Supabase auth callback
│   │   ├── dashboard/         # Main app: assignments, insights, settings
│   │   ├── features/          # Marketing: features page
│   │   ├── how-it-works/      # Marketing: how it works
│   │   ├── install/           # PWA install guide
│   │   ├── actions.ts         # Server actions
│   │   ├── globals.css        # Tailwind + design tokens
│   │   ├── layout.tsx         # Root layout + PWA meta
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (button, card, input, etc.)
│   │   ├── AssignmentCard.tsx
│   │   ├── AssignmentsClient.tsx
│   │   ├── AutoSync.tsx
│   │   ├── BehavioralInsightCard.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── MobileBrowserGate.tsx
│   │   ├── MobileInstallGuide.tsx
│   │   ├── OnboardingWizard.tsx
│   │   ├── ProductiveWindowsChart.tsx  # D3 bar chart
│   │   ├── PushNotificationButton.tsx
│   │   ├── SettingsForm.tsx
│   │   ├── StressAlert.tsx
│   │   ├── SyncNowButton.tsx
│   │   ├── TestNotifButton.tsx
│   │   └── WorkloadHeatmap.tsx         # D3 heatmap grid
│   ├── lib/                   # Business logic
│   │   ├── supabase/          # Server + browser DB clients
│   │   ├── canvas.ts          # Canvas API wrapper
│   │   ├── env.ts             # Zod-validated env vars
│   │   ├── ml.ts              # Focus pattern detection
│   │   ├── nim.ts             # NVIDIA NIM AI client
│   │   ├── store.ts           # Zustand global state
│   │   ├── time.ts            # Timezone utilities
│   │   ├── utils.ts           # Shared helpers
│   │   └── webpush.ts         # Web Push sender
│   ├── trigger/
│   │   └── nudge-engine.ts    # Trigger.dev hourly job
│   └── database.types.ts      # Supabase typegen
├── supabase/
│   └── schema.sql             # Full schema + RLS policies
├── worker/
│   └── index.js               # Push notification event handler
├── trigger.config.ts
├── next.config.ts
├── vercel.json
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── components.json            # shadcn/ui config
└── package.json
```

## Getting Started

```bash
git clone https://github.com/sthakri/duepulse.git
cd duepulse
npm install
```

Set up environment variables (Supabase URL + keys, Canvas token, NVIDIA NIM key, VAPID keys, Upstash Redis, Trigger.dev). Then run `supabase/schema.sql` in your Supabase SQL editor to create all tables and RLS policies.

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
