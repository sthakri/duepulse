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
  title = "DuePulse",
  ttlSeconds = 24 * 60 * 60
): Promise<void> {
  // TTL bounds how long the push service may hold an undeliverable message.
  // Deadline nudges pass their time-until-due so a "due in 1h" nudge to an
  // offline phone can't arrive 20 hours stale.
  await webpush.sendNotification(
    subscription,
    JSON.stringify({ title, body: message }),
    { TTL: ttlSeconds }
  );
}

export function getVapidPublicKey(): string {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}
