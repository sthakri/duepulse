"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, ArrowDown, Plus, CheckCircle, Ellipsis, Smartphone, Zap } from "lucide-react";

type Platform = "ios" | "android";

const iosSteps = [
  { icon: Share2, label: "Tap the Share icon at the bottom of Safari" },
  { icon: ArrowDown, label: 'Scroll down and tap "Add to Home Screen"' },
  { icon: Plus, label: 'Tap "Add" in the top-right corner' },
  { icon: CheckCircle, label: "Open DuePulse from your Home Screen — done!" },
];

const androidSteps = [
  { icon: Ellipsis, label: "Tap the three-dot menu in the top-right of Chrome" },
  { icon: ArrowDown, label: '"Add to Home Screen" or "Install app"' },
  { icon: Plus, label: 'Tap "Add" in the dialog that appears' },
  { icon: CheckCircle, label: "Open DuePulse from your Home Screen — done!" },
];

export default function InstallPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(() => {
    if (typeof navigator === "undefined") return "ios";
    return /Android/i.test(navigator.userAgent) ? "android" : "ios";
  });

  function handleBypass() {
    try { sessionStorage.setItem("duepulse_install_bypass", "true"); } catch {}
    router.push("/dashboard");
  }

  const steps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-start px-4 pt-14 pb-10 text-[#F8FAFC]">
      {/* Logo + headline */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mb-4">
          <Smartphone className="text-[#818CF8] w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#6366F1]/40 bg-[#6366F1]/15">
            <Zap size={11} className="text-[#818CF8]" fill="#818CF8" />
          </div>
          <span className="font-bold text-[#F8FAFC] text-sm tracking-tight">DuePulse</span>
        </div>
        <h1 className="text-[#F8FAFC] font-bold text-2xl leading-tight max-w-xs">
          Add DuePulse to Your Home Screen
        </h1>
        <p className="text-[#94A3B8] text-sm mt-3 max-w-xs leading-relaxed">
          Push notifications and the full app experience only work when DuePulse is installed as a standalone app.
        </p>
      </div>

      {/* Platform toggle */}
      <div className="flex items-center gap-1 bg-[#1E293B] border border-[#334155]/70 rounded-xl p-1 mb-6 w-full max-w-xs">
        {(["ios", "android"] as Platform[]).map((p) => (
          <button key={p} onClick={() => setPlatform(p)} aria-pressed={platform === p}
            className={`flex-1 py-2 rounded-[10px] text-sm font-medium transition-all ${platform === p ? "bg-[#6366F1] text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]" : "text-[#64748B] hover:text-[#94A3B8]"}`}>
            {p === "ios" ? "iOS (Safari)" : "Android (Chrome)"}
          </button>
        ))}
      </div>

      {/* Steps card */}
      <div className="w-full max-w-xs rounded-[18px] bg-[#1E293B] border border-[#334155]/70 p-5 mb-5">
        <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-4">How to install</p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#243044] border border-[#334155] text-[#94A3B8] text-[11px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <step.icon className="text-[#818CF8] w-4 h-4 shrink-0" />
                <p className="text-[#94A3B8] text-sm leading-snug">{step.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why it matters */}
      <div className="w-full max-w-xs rounded-[18px] bg-[#6366F1]/6 border border-[#6366F1]/20 p-4 mb-8">
        <p className="text-[#818CF8] text-sm font-semibold mb-1">Why does this matter?</p>
        <p className="text-[#94A3B8] text-sm leading-relaxed">
          DuePulse&apos;s core feature is nudging you at the right time. Browser tabs can&apos;t deliver background push notifications — the Home Screen app can.
        </p>
      </div>

      {/* Bypass */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3">
        <p className="text-[#64748B] text-xs text-center">Already added it? Open DuePulse from your Home Screen icon instead.</p>
        <button onClick={handleBypass}
          className="text-[#64748B] hover:text-[#94A3B8] hover:bg-[#1E293B] text-sm w-full py-2.5 rounded-xl transition-colors bg-transparent border border-[#334155]">
          Continue to Dashboard Anyway
        </button>
      </div>
    </main>
  );
}
