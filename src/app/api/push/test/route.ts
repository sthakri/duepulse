import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { Database } from "@/database.types";
import { sendPushNotification } from "@/lib/webpush";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).userId !== "string" ||
    !(body as Record<string, unknown>).userId
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { userId } = body as { userId: string };

  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: sub } = await serviceClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const subscription: webpush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await sendPushNotification(subscription, 'Push notifications are working!');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push test error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
