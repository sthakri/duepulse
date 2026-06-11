"use client";

import { useState } from "react";
import { Smartphone, Share2, ArrowDown, Plus, CheckCircle, Ellipsis, X } from "lucide-react";

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

export default function MobileInstallGuide() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      if (typeof sessionStorage === "undefined") return false;
      return sessionStorage.getItem("duepulse_install_dismissed") === "true";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);

  const platform = detectPlatform();
  if (!platform || dismissed) return null;

  const steps = platform === "ios" ? iosSteps : androidSteps;
  const osName = platform === "ios" ? "iOS" : "Android";

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("duepulse_install_dismissed", "true");
    } catch {
      // Silently fail if storage is unavailable
    }
  }

  return (
    <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4 mb-6 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Smartphone className="text-indigo-400 w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            Add DuePulse to your Home Screen
          </p>
          <p className="text-slate-300 text-sm mt-0.5">
            Get push notifications and offline access — works best as a standalone app on {osName}.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-indigo-400 hover:text-indigo-300 text-xs font-medium bg-transparent px-2 py-1 rounded-md hover:bg-indigo-500/10 transition-colors"
          >
            {expanded ? "Hide steps" : "Show steps"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors bg-transparent"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-8 space-y-3 pt-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-[11px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <s.icon className="text-indigo-400 w-4 h-4 shrink-0" />
                <p className="text-slate-300 text-sm leading-snug">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
