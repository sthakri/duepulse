"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

interface StressData {
  stressLevel: "low" | "medium" | "high";
  pileUpDetected: boolean;
  peakWindowStart: string | null;
  peakWindowEnd: string | null;
  assignmentCount: number;
  totalUpcoming: number;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function StressAlert({ userId }: { userId: string }) {
  const [data, setData] = useState<StressData | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      if (typeof sessionStorage === "undefined") return false;
      return sessionStorage.getItem("stress-alert-dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetch("/api/stress")
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.stressLevel === "string") {
          setData(d);
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null));
  }, [userId]);

  if (!data) return null;

  if (data.stressLevel === "low" || dismissed) return null;

  const isSevere = data.stressLevel === "high" || data.pileUpDetected;

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("stress-alert-dismissed", "true");
    } catch {
      // Silently fail if storage is unavailable
    }
  }

  const range =
    data.peakWindowStart && data.peakWindowEnd
      ? `${formatDate(data.peakWindowStart)} – ${formatDate(data.peakWindowEnd)}`
      : null;

  const countLabel = `${data.assignmentCount} assignment${data.assignmentCount !== 1 ? "s" : ""}`;

  if (isSevere) {
    const title = data.pileUpDetected ? "Pile-up detected" : "Heavy workload";
    return (
      <div className="rounded-[18px] bg-[#D6B36A]/8 border border-[#D6B36A]/25 p-4 flex items-start gap-3">
        <AlertTriangle className="text-[#D6B36A] w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[#F6F1E8] font-semibold text-sm">{title}</p>
          <p className="text-[#D6B36A]/80 text-sm mt-0.5">
            {range
              ? `${countLabel} due between ${range}`
              : `${countLabel} due soon`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[#D6B36A]/50 hover:text-[#D6B36A] transition-colors shrink-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-[#151C2B] border-l-4 border-[#D6B36A] border border-[#2A3444] p-4 flex items-start gap-3">
      <Info className="text-[#D6B36A] w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[#F6F1E8] font-semibold text-sm">Moderate workload</p>
        <p className="text-[#AAB4C4] text-sm mt-0.5">
          {range
            ? `${countLabel} due between ${range}`
            : `${countLabel} due soon`}
        </p>
      </div>
    </div>
  );
}
