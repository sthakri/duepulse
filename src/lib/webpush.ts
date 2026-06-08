import webpush from "web-push";
import { env } from "@/lib/env";

// Initialise VAPID details once at module load, not on every send.
webpush.setVapidDetails(
  "mailto:admin@duepulse.app",
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  message: string,
  title = "DuePulse"
): Promise<void> {
  await webpush.sendNotification(
    subscription,
    JSON.stringify({ title, body: message })
  );
}

export function getVapidPublicKey(): string {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}
