"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle, LogOut, Zap } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i);
  }
  return view as Uint8Array<ArrayBuffer>;
}

export default function OnboardingWizard({
  userEmail,
}: {
  userEmail?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courseCount, setCourseCount] = useState(0);

  async function handleSignOut() {
    await createClient().auth.signOut({ scope: "global" });
    router.push("/");
  }

  async function handleTestConnection() {
    setLoading(true);
    setError("");
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) {
      setError("You must be logged in to connect Canvas.");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/canvas/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, domain }),
    });
    const result: { success: boolean; courseCount: number; error?: string } =
      await res.json();
    if (!result.success) {
      setError(result.error ?? "Connection failed");
    } else {
      await createClient().from("profiles").upsert({
        id: user.id,
        canvas_domain: domain,
        canvas_token: token,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setCourseCount(result.courseCount);
      setStep(2);
    }
    setLoading(false);
  }

  function isIOS(): boolean {
    if (typeof window === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes("Mac") && "ontouchend" in document)
    );
  }

  async function handleEnableNotifications() {
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();

      if (!user) {
        setStep(4);
        return;
      }

      if (isIOS() && !("Notification" in window)) {
        toast.info(
          "Add DuePulse to your Home Screen to enable notifications on iPhone",
          { duration: 6000 },
        );
        setStep(4);
        return;
      }

      if (!("Notification" in window)) {
        toast.error("Notifications are not supported in this browser");
        setStep(4);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStep(4);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        toast.info(
          "Push notifications are unavailable in development mode. They will work in production.",
          { duration: 6000 },
        );
        setStep(4);
        return;
      }

      if (!("serviceWorker" in navigator)) {
        toast.error("Notifications are not supported in this browser");
        setStep(4);
        return;
      }
      let registration;
      try {
        const existing = await navigator.serviceWorker.getRegistration("/");
        if (!existing) {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
        registration = await navigator.serviceWorker.ready;
      } catch {
        toast.error("Failed to register service worker for notifications");
        setStep(4);
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        ),
      });

      const json = sub.toJSON();
      const keys = json.keys!;

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save push subscription");
      }

      toast.success("Nudges enabled! You'll get timely reminders.");
    } catch (err) {
      console.error("Push notification setup failed:", err);
      toast.error("Could not enable notifications. You can try again later.");
    }
    setStep(4);
  }

  async function handleGoToDashboard() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, onboarding_complete: true });

      const { data: profile } = await supabase
        .from("profiles")
        .select("canvas_token, canvas_domain")
        .eq("id", user.id)
        .single();

      fetch("/api/canvas/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          token: profile?.canvas_token ?? "",
          domain: profile?.canvas_domain ?? "",
        }),
      });
    }
    router.push("/dashboard");
  }

  const inputCls =
    "w-full rounded-xl bg-[#0C111B] border border-[#2A3444] text-[#F6F1E8] placeholder:text-[#7E8AA0] text-sm px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#D6B36A] min-h-11";

  return (
    <div className="w-full max-w-md bg-[#151C2B] rounded-[20px] border border-[#2A3444] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center">
            <Zap size={14} className="text-[#D6B36A]" fill="#D6B36A" />
          </div>
          <span className="font-bold text-[#F6F1E8] tracking-tight">
            DuePulse
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-[#7E8AA0] text-xs hidden sm:block truncate max-w-[120px]">
              {userEmail}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-[#7E8AA0] hover:text-[#C97064] text-xs transition-colors bg-transparent"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              n === step
                ? "bg-[#D6B36A] w-6"
                : n < step
                  ? "bg-[#D6B36A]/40 w-3"
                  : "bg-[#2A3444] w-3"
            }`}
          />
        ))}
      </div>

      {/* ── Step 1: Connect Canvas ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-[#F6F1E8] font-bold text-2xl">
              Connect Canvas
            </h1>
            <p className="text-[#AAB4C4] text-sm mt-1">
              Link your Canvas account to get started.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="domain" className="text-[#AAB4C4] text-sm block">
              Canvas Domain
            </label>
            <input
              id="domain"
              type="text"
              placeholder="yourschool.instructure.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="token" className="text-[#AAB4C4] text-sm block">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                id="token"
                type={showToken ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-[#7E8AA0] hover:text-[#AAB4C4]"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[#7E8AA0] text-xs">
              Canvas → Account → Settings → New Access Token
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={loading || !domain || !token}
            className="w-full rounded-xl bg-[#D6B36A] hover:bg-[#E0BF78] disabled:opacity-50 disabled:cursor-not-allowed text-[#0C111B] font-semibold text-sm py-3 transition-colors min-h-11"
          >
            {loading ? "Testing…" : "Test Connection →"}
          </button>

          {error && (
            <p className="text-[#C97064] text-sm">{error}</p>
          )}
        </div>
      )}

      {/* ── Step 2: Connected ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5 text-center">
          <CheckCircle className="text-[#7FAE9D] w-12 h-12 mx-auto" />
          <div>
            <p className="text-[#F6F1E8] font-bold text-xl">
              Connected to {domain}
            </p>
            <p className="text-[#AAB4C4] text-sm mt-1">
              Found {courseCount} course{courseCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-[#2A3444] bg-transparent text-[#AAB4C4] hover:text-[#F6F1E8] hover:bg-[#1C2637] text-sm font-medium py-3 transition-colors min-h-11"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-[2] rounded-xl bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold text-sm py-3 transition-colors min-h-11"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Enable Nudges ─────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-[#F6F1E8] font-bold text-2xl">
              Enable Nudges
            </h1>
            <p className="text-[#AAB4C4] text-sm mt-1">
              Get timely reminders before assignments are due.
            </p>
          </div>
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="w-full rounded-xl bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold text-sm py-3 transition-colors min-h-11"
          >
            Enable Nudges
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-[#2A3444] bg-transparent text-[#AAB4C4] hover:text-[#F6F1E8] hover:bg-[#1C2637] text-sm font-medium py-3 transition-colors min-h-11"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-[2] text-[#7E8AA0] hover:text-[#AAB4C4] text-sm py-3 bg-transparent min-h-11 transition-colors"
            >
              Enable later in Settings
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: All set ───────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div>
            <h1 className="text-[#F6F1E8] font-bold text-2xl">
              You&apos;re all set!
            </h1>
            <p className="text-[#AAB4C4] text-sm mt-1">
              Your Canvas assignments are syncing in the background.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl border border-[#2A3444] bg-transparent text-[#AAB4C4] hover:text-[#F6F1E8] hover:bg-[#1C2637] text-sm font-medium py-3 transition-colors min-h-11"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="flex-[2] rounded-xl bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold text-sm py-3 transition-colors min-h-11"
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
