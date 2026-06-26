import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { Database } from "@/database.types";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

export async function POST(req: NextRequest) {
  const response = NextResponse.json({});

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const { success: rateLimitOk } = await ratelimit.limit(userId);
  if (!rateLimitOk) {
    console.warn("push subscribe rate limited:", userId);
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).endpoint !== "string" ||
    typeof (body as Record<string, unknown>).p256dh !== "string" ||
    typeof (body as Record<string, unknown>).auth !== "string" ||
    !(body as Record<string, unknown>).endpoint ||
    !(body as Record<string, unknown>).p256dh ||
    !(body as Record<string, unknown>).auth
  ) {
    console.warn("push subscribe validation failed");
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { endpoint, p256dh, auth } = body as {
    endpoint: string;
    p256dh: string;
    auth: string;
  };

  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    await serviceClient
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, endpoint, p256dh, auth },
        { onConflict: "endpoint" }
      )
      .throwOnError();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}