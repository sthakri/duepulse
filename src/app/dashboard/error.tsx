"use client";

import { useState } from "react";
import { Smartphone, Share2, ArrowDown, Plus, CheckCircle, Ellipsis, Zap } from "lucide-react";

type Platform = "ios" | "android" | null;

const iosSteps = [
  { icon: Share2, label: "Tap the share icon at the bottom of Safari" },
  { icon: ArrowDown, label: "Scroll down and tap Add to Home Screen" },
  { icon: Plus, label: "Tap Add in the top right corner" },
  { icon: CheckCircle, label: "Open DuePulse from your home screen" },
];

const androidSteps = [
  { icon: Ellipsis, label: "Tap the three dots in the top right of Chrome" },
  { icon: ArrowDown, label: "Tap Add to Home Screen" },
  { icon: Plus, label: "Tap Add in the bottom right" },
  { icon: CheckCircle, label: "Open DuePulse from your home screen" },
];

function detectPlatform(): Platform {
  if (typeof navigator === "undefined" || typeof window === "undefined") return null;
  if ((window.navigator as { standalone?: boolean }).standalone === true) return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const platform = detectPlatform();

  if (platform && !dismissed) {
    const steps = platform === "ios" ? iosSteps : androidSteps;
    const osName = platform === "ios" ? "iOS" : "Android";

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 mb-6">
            <Smartphone className="text-[#818CF8] w-8 h-8" />
          </div>
          <h1 className="text-[#F8FAFC] font-bold text-2xl mb-2">Add DuePulse to your Home Screen</h1>
          <p className="text-[#94A3B8] text-sm mb-8 leading-relaxed">
            DuePulse works best as a standalone app on {osName}.<br />
            Follow the steps below to install it.
          </p>

          <div className="text-left space-y-5 mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#243044] border border-[#334155] text-[#94A3B8] text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <s.icon className="text-[#818CF8] w-5 h-5 shrink-0" />
                  <p className="text-[#94A3B8] text-sm leading-snug text-left">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => { setDismissed(true); reset(); }}
            className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white px-6 py-3 text-base font-semibold transition-colors w-full shadow-[0_8px_25px_rgba(99,102,241,0.25)]">
            Try Again
          </button>

          <button onClick={() => setShowDetails(!showDetails)} className="mt-4 text-[#64748B] hover:text-[#94A3B8] text-xs transition-colors bg-transparent">
            {showDetails ? "Hide technical details" : "Show technical details"}
          </button>

          {showDetails && (
            <p className="mt-3 text-[#EF4444] text-xs font-mono bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-left break-all max-h-32 overflow-y-auto">
              {error.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 mb-6">
          <Zap className="text-[#818CF8] w-8 h-8" />
        </div>
        <h1 className="text-[#F8FAFC] font-bold text-2xl mb-3">Something went wrong</h1>
        <p className="text-[#94A3B8] text-base mb-6">
          Couldn&apos;t load your dashboard. This usually happens after a fresh sign-in — try reloading.
        </p>
        <button onClick={reset}
          className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white px-6 py-3 text-base font-semibold transition-colors shadow-[0_8px_25px_rgba(99,102,241,0.25)]">
          Try Again
        </button>
      </div>
    </div>
  );
}
