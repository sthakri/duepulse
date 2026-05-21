"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courseCount, setCourseCount] = useState(0);

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

  async function handleEnableNotifications() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        ),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    }
    setStep(4);
  }

  async function handleGoToDashboard() {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (user) {
      await createClient()
        .from("profiles")
        .upsert({ id: user.id, onboarding_complete: true });
    }
    fetch("/api/canvas/sync", { method: "POST" });
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md bg-slate-800 rounded-xl p-6 sm:p-8">
      <div className="flex gap-2 justify-center mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`w-2 h-2 rounded-full ${
              n === step ? "bg-indigo-500" : "bg-slate-600"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-white font-semibold text-2xl">
              Connect Canvas
            </h1>
            <p className="text-slate-300 text-base mt-1">
              Link your Canvas account to get started.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="domain" className="text-slate-300">
              Canvas Domain
            </Label>
            <Input
              id="domain"
              type="text"
              placeholder="yourschool.instructure.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="token" className="text-slate-300">
              Personal Access Token
            </Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 pr-12 min-h-11"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-300"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-slate-400 text-base">
              Canvas → Account → Settings → New Access Token
            </p>
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={loading || !domain || !token}
            className="bg-indigo-500 hover:bg-indigo-600 text-white w-full min-h-11"
          >
            {loading ? "Testing…" : "Test Connection →"}
          </Button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 text-center">
          <CheckCircle className="text-emerald-400 w-12 h-12 mx-auto" />
          <div>
            <p className="text-white font-semibold text-lg">
              Connected to {domain}
            </p>
            <p className="text-slate-300 text-base mt-1">
              Found {courseCount} course{courseCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => setStep(3)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white w-full min-h-11"
          >
            Continue →
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-white font-semibold text-2xl">Enable Nudges</h1>
            <p className="text-slate-300 text-base mt-1">
              Get timely reminders before assignments are due.
            </p>
          </div>

          <Button
            onClick={handleEnableNotifications}
            className="bg-indigo-500 hover:bg-indigo-600 text-white w-full min-h-11"
          >
            Enable Nudges
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-slate-400 text-base hover:text-slate-300 min-h-11 flex items-center justify-center w-full"
            >
              Enable later in Settings
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5 text-center">
          <div>
            <h1 className="text-white font-semibold text-2xl">
              You&apos;re all set!
            </h1>
            <p className="text-slate-300 text-base mt-1">
              Your Canvas assignments are syncing in the background.
            </p>
          </div>
          <Button
            onClick={handleGoToDashboard}
            className="bg-indigo-500 hover:bg-indigo-600 text-white w-full min-h-11"
          >
            Go to Dashboard →
          </Button>
        </div>
      )}
    </div>
  );
}
