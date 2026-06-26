import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { Database } from "@/database.types";
import { sendPushNotification } from "@/lib/webpush";
import webpush from "web-push";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});

export async function POST(req: NextRequest) {
  if (env.NODE_ENV !== "development") {
    return NextResponse.json({}, { status: 404 });
  }

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
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).userId !== "string" ||
    typeof (body as Record<string, unknown>).endpoint !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { endpoint } = body as { userId: string; endpoint: string };

  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: sub } = await serviceClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .single();

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found for this device — re-enable notifications", expired: true }, { status: 404 });
  }

  const subscription: webpush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await sendPushNotification(subscription, "Push notifications are working!");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      return NextResponse.json(
        { error: "Subscription expired — re-enable notifications", expired: true },
        { status: 410 }
      );
    }
    return NextResponse.json({ error: "Push service unreachable — try again later" }, { status: 502 });
  }
}