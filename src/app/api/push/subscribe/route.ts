import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Database } from "@/database.types";
import { pushSubscribeSchema } from "@/lib/validations";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "rl:push:subscribe",
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
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

  const raw: unknown = await req.json();
  const parsed = pushSubscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 422 });
  }

  const { endpoint, p256dh, auth } = parsed.data;

  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    // Endpoints are globally unique. Without this, a logged-in user could
    // submit someone else's endpoint and steal/overwrite their row (their
    // keys wouldn't match, silently killing the victim's notifications).
    await serviceClient
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .neq("user_id", userId)
      .throwOnError();

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

// Unsubscribe: let a user purge their own push rows on demand (previously
// they persisted until a failed send returned 404/410).
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success: rateLimitOk } = await ratelimit.limit(user.id);
  if (!rateLimitOk) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const raw: unknown = await req.json();
  const parsed = pushSubscribeSchema.partial({ p256dh: true, auth: true }).safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 422 });
  }

  try {
    // RLS scopes deletes to the caller's rows.
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", parsed.data.endpoint)
      .throwOnError();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}