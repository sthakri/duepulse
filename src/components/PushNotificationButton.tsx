"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";

type PushState =
  | "idle"
  | "requesting"
  | "subscribed"
  | "denied"
  | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationButton({ userId }: { userId: string }) {
  const [state, setState] = useState<PushState>(() => {
    // Lazy initializer runs synchronously on mount to set the correct initial
    // state without triggering an extra render from setState inside useEffect.
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission === "granted") return "idle"; // async check below will set "subscribed"
    return "idle";
  });

  // Re-associate existing push subscription with the current userId on mount
  // and whenever the userId changes (e.g. account switch).
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription() ?? null)
      .then(async (sub) => {
        if (!sub) {
          setState("idle");
          return;
        }
        const json = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        try {
          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            }),
          });
          if (!res.ok) {
            const body = await res.text();
            console.warn("push re-association failed:", res.status, body);
          }
        } catch (err) {
          console.warn("push re-association error:", err);
        }
        setState("subscribed");
      })
      .catch(() => setState("idle"));
  }, [userId]);

  async function handleClick() {
    if (state !== "idle") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Push notifications are not supported in this browser");
      setState("unsupported");
      return;
    }
    setState("requesting");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "idle");
      return;
    }

    try {
      // Ensure SW is registered, then unconditionally wait for the active
      // registration. Without this, an updating/installing SW causes an AbortError.
      try {
        const existing = await navigator.serviceWorker.getRegistration("/");
        if (!existing) {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
      } catch {
        // Ignore registration errors — ready will resolve if any SW is active
      }

      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch {
        toast.error(
          "Push notifications require a service worker. Try again after setup.",
        );
        setState("idle");
        return;
      }

      if (!registration.pushManager) {
        toast.error(
          "Push notifications require a service worker. Try again after setup.",
        );
        setState("idle");
        return;
      }

      const vapidKey = urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
      if (vapidKey.length !== 65 || vapidKey[0] !== 0x04) {
        console.error(
          "VAPID public key invalid: decoded length =",
          vapidKey.length,
          "first byte =",
          vapidKey[0],
        );
        toast.error("Push configuration error — contact support");
        setState("idle");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as unknown as ArrayBuffer,
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.warn("push subscribe failed:", res.status, body);
        toast.warning("Subscription saved locally — server sync will retry");
      } else {
        toast.success("Nudges enabled");
      }
      setState("subscribed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable notifications");
      setState("idle");
    }
  }

  if (state === "unsupported") {
    return (
      <div className="text-slate-400 text-xs">
        Notifications unavailable in this browser
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="text-slate-400 text-xs">
        Notifications blocked — enable in browser settings
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
        <CheckCircle size={16} />
        Nudges enabled
      </span>
    );
  }

  if (state === "requesting") {
    return (
      <Button disabled>
        <Skeleton className="h-4 w-24" />
      </Button>
    );
  }

  return (
    <Button
      className="bg-indigo-500 hover:bg-indigo-600 text-white"
      onClick={handleClick}
    >
      Enable Nudges
    </Button>
  );
}
