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
  const [state, setState] = useState<PushState>("idle");

  useEffect(() => {
    if (!("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (Notification.permission === "granted") {
      // Only show "subscribed" if the browser actually has an active push subscription.
      // If the DB write failed on a previous attempt, permission is granted but no
      // subscription exists yet — reset to idle so the user can retry.
      navigator.serviceWorker
        .getRegistration("/")
        .then((reg) => reg?.pushManager.getSubscription() ?? null)
        .then((sub) => {
          setState(sub ? "subscribed" : "idle");
        })
        .catch(() => setState("idle"));
    }
  }, []);

  async function handleClick() {
    if (state !== "idle") return;
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
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("subscribe failed:", res.status, body);
        throw new Error("Subscribe failed");
      }
      setState("subscribed");
      window.location.reload();
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
