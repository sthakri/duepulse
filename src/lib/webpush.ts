import webpush from "web-push";
import { env } from "@/lib/env";

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  message: string
): Promise<void> {
  webpush.setVapidDetails(
    "mailto:admin@duepulse.app",
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  await webpush.sendNotification(
    subscription,
    JSON.stringify({ title: "DuePulse", body: message })
  );
}

export function getVapidPublicKey(): string {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}
