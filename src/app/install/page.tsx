"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Share2,
  ArrowDown,
  Plus,
  CheckCircle,
  Ellipsis,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "ios" | "android";

const iosSteps = [
  {
    icon: Share2,
    label: "Tap the Share icon at the bottom of Safari",
  },
  {
    icon: ArrowDown,
    label: 'Scroll down and tap "Add to Home Screen"',
  },
  {
    icon: Plus,
    label: 'Tap "Add" in the top-right corner',
  },
  {
    icon: CheckCircle,
    label: "Open DuePulse from your Home Screen — done!",
  },
];

const androidSteps = [
  {
    icon: Ellipsis,
    label: "Tap the three-dot menu in the top-right of Chrome",
  },
  {
    icon: ArrowDown,
    label: '"Add to Home Screen" or "Install app"',
  },
  {
    icon: Plus,
    label: 'Tap "Add" in the dialog that appears',
  },
  {
    icon: CheckCircle,
    label: "Open DuePulse from your Home Screen — done!",
  },
];

export default function InstallPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(() => {
    if (typeof navigator === "undefined") return "ios";
    return /Android/i.test(navigator.userAgent) ? "android" : "ios";
  });

  function handleBypass() {
    try {
      sessionStorage.setItem("duepulse_install_bypass", "true");
    } catch {
      // sessionStorage unavailable — bypass anyway
    }
    router.push("/dashboard");
  }

  const steps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-start px-4 pt-14 pb-10">
      {/* Logo + headline */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Smartphone className="text-indigo-400 w-8 h-8" />
        </div>
        <h1 className="text-white font-bold text-2xl leading-tight max-w-xs">
          Add DuePulse to Your Home Screen
        </h1>
        <p className="text-slate-300 text-sm mt-3 max-w-xs leading-relaxed">
          Push notifications and the full app experience only work when DuePulse
          is installed as a standalone app — not inside a browser tab.
        </p>
      </div>

      {/* Platform toggle */}
      <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 mb-6 w-full max-w-xs">
        {(["ios", "android"] as Platform[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              platform === p
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-pressed={platform === p}
          >
            {p === "ios" ? "iOS (Safari)" : "Android (Chrome)"}
          </button>
        ))}
      </div>

      {/* Steps card */}
      <div className="w-full max-w-xs rounded-xl bg-slate-800 p-4 mb-6">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
          How to install
        </p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-[11px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <step.icon className="text-indigo-400 w-4 h-4 shrink-0" />
                <p className="text-slate-200 text-sm leading-snug">
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why it matters */}
      <div className="w-full max-w-xs rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4 mb-8">
        <p className="text-indigo-300 text-sm font-semibold mb-1">
          Why does this matter?
        </p>
        <p className="text-slate-300 text-sm leading-relaxed">
          DuePulse&apos;s core feature is nudging you at the right time. Browser
          tabs can&apos;t deliver background push notifications — the Home
          Screen app can.
        </p>
      </div>

      {/* Bypass */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3">
        <p className="text-slate-500 text-xs text-center">
          Already added it? Open DuePulse from your Home Screen icon instead.
        </p>
        <Button
          variant="ghost"
          onClick={handleBypass}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm w-full"
        >
          Continue to Dashboard Anyway
        </Button>
      </div>
    </main>
  );
}
