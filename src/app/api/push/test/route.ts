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

  const { data: subs } = await serviceClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "No subscription found - enable notifications first" }, { status: 404 });
  }

  const results: string[] = [];
  let anySent = false;

  for (const sub of subs) {
    const subscription: webpush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await sendPushNotification(subscription, "Push notifications are working!");
      results.push("sent");
      anySent = true;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        results.push("expired");
      } else {
        results.push("error");
      }
    }
  }

  if (!anySent) {
    const hasExpired = results.some((r) => r === "expired");
    if (hasExpired) {
      return NextResponse.json(
        { error: "Subscription expired - re-enable notifications", expired: true },
        { status: 410 }
      );
    }
    return NextResponse.json({ error: "Push service unreachable - try again later" }, { status: 502 });
  }

  return NextResponse.json({ success: true, devices: results });
}
