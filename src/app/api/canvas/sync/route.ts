import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { syncUserCanvas } from "@/lib/canvas-sync";
import { Database } from "@/database.types";

const autoRatelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "ratelimit:sync:auto",
});

const manualRatelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix: "ratelimit:sync:manual",
});

export async function POST(req: NextRequest) {
  // ── 1. Authenticate via session cookie — never trust body.userId ──────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  // ── 2. Rate-limit by the verified user ID and sync source ─────────────────
  const source = req.nextUrl.searchParams.get("source") === "auto" ? "auto" : "manual";
  const limiter = source === "auto" ? autoRatelimit : manualRatelimit;
  const { success: rateLimitOk } = await limiter.limit(userId);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many syncs. Try again later." },
      { status: 429 }
    );
  }

  // ── 3. Sync via the shared service-role path (same one the scheduled
  //      canvas-sync task uses, so offline users get identical data) ─────────
  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const result = await syncUserCanvas(serviceClient, userId);

  if (result.ok) {
    return NextResponse.json({ success: true, synced: result.synced });
  }
  if (result.reason === "token_expired") {
    return NextResponse.json(
      { success: false, tokenExpired: true, error: result.message },
      { status: 401 }
    );
  }
  if (result.reason === "decrypt_failed") {
    return NextResponse.json(
      { success: false, decryptFailed: true, error: result.message },
      { status: 401 }
    );
  }
  const status = result.reason === "db_error" ? 500 : 400;
  return NextResponse.json({ success: false, error: result.message }, { status });
}
