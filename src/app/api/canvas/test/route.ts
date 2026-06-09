import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { testCanvasConnection } from "@/lib/canvas";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  // Tighter limit: token probing is a brute-force vector
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

export async function POST(req: NextRequest) {
  // ── 1. Authenticate — unauthenticated token probing is not allowed ────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Rate-limit by verified user ID ─────────────────────────────────────
  const { success } = await ratelimit.limit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  // ── 3. Validate body ──────────────────────────────────────────────────────
  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).token !== "string" ||
    typeof (body as Record<string, unknown>).domain !== "string" ||
    !(body as Record<string, unknown>).token ||
    !(body as Record<string, unknown>).domain
  ) {
    return NextResponse.json(
      { error: "Missing token or domain" },
      { status: 400 }
    );
  }
  const { token, domain } = body as { token: string; domain: string };

  const result = await testCanvasConnection(token, domain);
  return NextResponse.json(result);
}
