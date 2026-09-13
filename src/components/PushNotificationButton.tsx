"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";

type PushState = "loading" | "idle" | "requesting" | "subscribed" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushNotificationButton({ userId }: { userId: string }) {
  // Start in "loading" so SSR and the first client render are IDENTICAL —
  // reading Notification.permission in the initializer caused a hydration
  // mismatch (server renders one branch, client another).
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    let mounted = true;

    async function postSubscription(sub: PushSubscription) {
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      // Skip the verify-POST if this endpoint was already server-confirmed
      // this session — each POST counts against the 10/hour rate limit.
      const cacheKey = `push-synced:${userId}`;
      if (sessionStorage.getItem(cacheKey) === json.endpoint) return true;
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }) });
      if (res.ok) {
        sessionStorage.setItem(cacheKey, json.endpoint);
        return true;
      }
      return false;
    }

    async function bootstrap() {
      await Promise.resolve(); // settle out of the effect body (no sync setState)
      if (!("Notification" in window)) { if (mounted) setState("unsupported"); return; }
      if (Notification.permission === "denied") { if (mounted) setState("denied"); return; }
      if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) { if (mounted) setState(Notification.permission === "default" ? "idle" : "unsupported"); return; }
      navigator.serviceWorker.getRegistration("/")
      .then(async (reg) => {
        if (!reg || !mounted) return;
        // Subscription expired since last visit → getSubscription() is null.
        // Re-subscribe ONLY if this browser previously synced one (session
        // marker) — never auto-subscribe a user who never opted in.
        let sub = await reg.pushManager.getSubscription();
        if (!sub && sessionStorage.getItem(`push-synced:${userId}`)) {
          const vapidKey = urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
          if (vapidKey.length !== 65 || vapidKey[0] !== 0x04) { if (mounted) setState("idle"); return; }
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey as unknown as ArrayBuffer });
        }
        if (!sub) { if (mounted) setState("idle"); return; } // fresh user — wait for them to click Enable
        if (!mounted) return;
        try {
          if (await postSubscription(sub)) { if (mounted) setState("subscribed"); }
          else if (mounted) setState("idle");
        } catch (err) { console.warn("push re-association error:", err); if (mounted) setState("idle"); }
      })
      .catch(() => { if (mounted) setState("idle"); });
    }

    bootstrap().catch(() => { if (mounted) setState("idle"); });
    return () => { mounted = false; };
  }, [userId]);

  async function handleClick() {
    if (state !== "idle") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { toast.error("Push notifications are not supported in this browser"); setState("unsupported"); return; }
    setState("requesting");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setState(permission === "denied" ? "denied" : "idle"); return; }

    try {
      // Use the registration directly — awaiting navigator.serviceWorker.ready
      // can hang forever if registration failed (registration rejected above
      // would have been swallowed), leaving this button stuck "requesting".
      let registration: ServiceWorkerRegistration;
      try {
        registration =
          (await navigator.serviceWorker.getRegistration("/")) ??
          (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      } catch { toast.error("Push notifications require a service worker. Try again after setup."); setState("idle"); return; }

      if (!registration.pushManager) { toast.error("Push notifications require a service worker. Try again after setup."); setState("idle"); return; }

      const vapidKey = urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
      if (vapidKey.length !== 65 || vapidKey[0] !== 0x04) { toast.error("Push configuration error — contact support"); setState("idle"); return; }

      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey as unknown as ArrayBuffer });
      const { endpoint, keys } = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };

      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }) });
      if (!res.ok) { toast.warning("Subscription saved locally - server sync will retry"); setState("idle"); }
      else {
        sessionStorage.setItem(`push-synced:${userId}`, endpoint);
        toast.success("Nudges enabled");
        setState("subscribed");
      }
    } catch (err) { console.error(err); toast.error("Failed to enable notifications"); setState("idle"); }
  }

  if (state === "unsupported") return <div className="text-[#64748B] text-xs">Notifications unavailable in this browser</div>;
  if (state === "denied") return <div className="text-[#64748B] text-xs">Notifications blocked — enable in browser settings</div>;

  if (state === "subscribed") return (
    <span className="flex items-center gap-1.5 text-[#10B981] text-sm font-medium">
      <CheckCircle size={15} />
      Nudges enabled
    </span>
  );

  if (state === "loading" || state === "requesting") return (
    <Button disabled aria-label={state === "loading" ? "Checking notification status" : undefined} className="bg-[#243044] border border-[#334155] text-[#94A3B8] rounded-xl h-9 shadow-none">
      <Skeleton className="h-4 w-24 bg-[#334155]" />
    </Button>
  );

  return (
    <Button
      className="bg-[#1E293B] hover:bg-[#243044] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl h-9 shadow-none text-sm font-medium"
      onClick={handleClick}
    >
      Enable Nudges
    </Button>
  );
}
