"use client";

import Link from "next/link";
import { useDuePulseStore } from "@/lib/store";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

export default function TokenExpiredBanner() {
  const tokenExpired = useDuePulseStore((s) => s.tokenExpired);
  const [dismissed, setDismissed] = useState(false);

  if (!tokenExpired || dismissed) return null;

  return (
    <div className="border-b border-[#EF4444]/30 bg-[#EF4444]/10 px-5 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm">
          <AlertCircle size={16} className="shrink-0 text-[#EF4444]" />
          <p className="text-[#F8FAFC]">
            <span className="font-semibold text-[#EF4444]">Canvas connection issue.</span>{" "}
            <span className="text-[#CBD5E1]">Your Canvas token is invalid or expired — reconnect your account to resume syncing.</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/onboarding"
            className="rounded-lg bg-[#EF4444] px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#DC2626]"
          >
            Reconnect
          </Link>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-[#94A3B8] transition hover:text-[#CBD5E1]"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
