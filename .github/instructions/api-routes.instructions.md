---
description: "Use when creating or editing API routes in src/app/api/. Enforces rate limiting, env var access, server-only Supabase client, and input validation requirements."
applyTo: "src/app/api/**"
---

# API Route Requirements

Every externally-facing route **must** include all four of the following. Use [`src/app/api/canvas/sync/route.ts`](../../src/app/api/canvas/sync/route.ts) as the canonical reference.

## 1. Rate Limiting

Initialize `@upstash/ratelimit` at module level using Redis from env:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
});
```

Call `ratelimit.limit(identifier)` early in the handler — before any DB or external call — and return `429` on failure.

## 2. Environment Variables

Never access `process.env` directly. Always import from `@/lib/env`:

```ts
import { env } from "@/lib/env";
```

## 3. Supabase Server Client

API routes must use the **server** client only:

```ts
import { createServerClient } from "@supabase/ssr";
// NOT: import { createBrowserClient } from "@supabase/ssr";
```

## 4. Input Validation

Validate and narrow all incoming request bodies before touching the DB or any external service. Reject with `400` on bad input:

```ts
const body: unknown = await req.json();
if (
  typeof body !== "object" ||
  body === null ||
  typeof (body as Record<string, unknown>).userId !== "string"
) {
  return NextResponse.json(
    { error: "Missing required fields" },
    { status: 400 },
  );
}
```
