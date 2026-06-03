<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# DuePulse — Agent Instructions

Canvas-synced student assignment planner with AI-generated push notification nudges, D3 workload visualizations, and a Trigger.dev background job engine.

**Installed versions:** Next.js 16.2.6 · React 19 · TypeScript strict · Tailwind 4

## Key Docs (read before working in these areas)

| Topic                              | File                                       |
| ---------------------------------- | ------------------------------------------ |
| Stack rules (non-negotiable)       | [docs/RULES.md](docs/RULES.md)             |
| Design system (colors, components) | [docs/DESIGN.md](docs/DESIGN.md)           |
| Database schema                    | [supabase/schema.sql](supabase/schema.sql) |
| Tech debt & known issues           | [CLAUDE.md](CLAUDE.md)                     |
| Build progress & upcoming sessions | [docs/PROGRESS.md](docs/PROGRESS.md)       |

## Build Commands

```sh
npm run dev      # next dev --webpack  (--webpack flag is required)
npm run build    # next build --webpack
npm run lint
```

## Critical Patterns

### Environment Variables

Never access `process.env` directly. All env vars are validated at startup — always import from [`src/lib/env.ts`](src/lib/env.ts):

```ts
import { env } from "@/lib/env";
```

### Supabase Client Selection

- **Server Components & API routes** → `src/lib/supabase/server.ts` (`createServerClient`)
- **Client Components** → `src/lib/supabase/client.ts` (`createBrowserClient`)
- Wrong client = silent auth failures. RLS is enabled on every table.

### AI / NVIDIA NIM

Never import the provider (`@ai-sdk/openai`) directly. Always go through [`src/lib/nim.ts`](src/lib/nim.ts):

```ts
import { generateNudge } from "@/lib/nim";
```

### D3 Charts

All charts use D3 — never Recharts or Chart.js. Reference implementations:

- [`src/components/WorkloadHeatmap.tsx`](src/components/WorkloadHeatmap.tsx) — 2D grid chart
- [`src/components/ProductiveWindowsChart.tsx`](src/components/ProductiveWindowsChart.tsx) — bar chart

### Client State

Zustand only — no React Context for global state. Store lives in [`src/lib/store.ts`](src/lib/store.ts).

### shadcn/ui Components

Components live in `src/components/ui/` — **never modify them**. Always pass `className` to override default light styles for the dark theme:

```tsx
<Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
```

### API Routes — Required Checklist

Every externally-facing API route must have:

1. `@upstash/ratelimit` guard (see [`src/app/api/canvas/sync/route.ts`](src/app/api/canvas/sync/route.ts) as reference)
2. Env vars via `env` from `src/lib/env.ts`
3. Supabase server client (not browser client)
4. Input validation before any DB/external call

### Background Jobs

Long-running tasks use Trigger.dev — never raw cron routes. Jobs live in [`src/trigger/`](src/trigger/).
