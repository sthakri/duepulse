"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

interface StressData { stressLevel: "low" | "medium" | "high"; pileUpDetected: boolean; peakWindowStart: string | null; peakWindowEnd: string | null; assignmentCount: number; totalUpcoming: number }

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function StressAlert({ userId }: { userId: string }) {
  const [data, setData] = useState<StressData | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof sessionStorage !== "undefined" && sessionStorage.getItem("stress-alert-dismissed") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    fetch("/api/stress").then((r) => r.json()).then((d) => {
      if (d && typeof d.stressLevel === "string") setData(d);
      else setData(null);
    }).catch(() => setData(null));
  }, [userId]);

  if (!data || data.stressLevel === "low" || dismissed) return null;

  const isSevere = data.stressLevel === "high" || data.pileUpDetected;
  function handleDismiss() {
    setDismissed(true);
    try { sessionStorage.setItem("stress-alert-dismissed", "true"); } catch {}
  }

  const range = data.peakWindowStart && data.peakWindowEnd ? `${formatDate(data.peakWindowStart)} – ${formatDate(data.peakWindowEnd)}` : null;
  const countLabel = `${data.assignmentCount} assignment${data.assignmentCount !== 1 ? "s" : ""}`;

  if (isSevere) {
    const title = data.pileUpDetected ? "Pile-up detected" : "Heavy workload";
    return (
      <div className="rounded-[18px] bg-[#F59E0B]/8 border border-[#F59E0B]/25 p-4 flex items-start gap-3">
        <AlertTriangle className="text-[#F59E0B] w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[#F8FAFC] font-semibold text-sm">{title}</p>
          <p className="text-[#F59E0B]/80 text-sm mt-0.5">{range ? `${countLabel} due between ${range}` : `${countLabel} due soon`}</p>
        </div>
        <button type="button" onClick={handleDismiss} className="text-[#F59E0B]/50 hover:text-[#F59E0B] transition-colors shrink-0 bg-transparent">
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-[#1E293B] border-l-4 border-[#38BDF8] border border-[#334155]/70 p-4 flex items-start gap-3">
      <Info className="text-[#38BDF8] w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[#F8FAFC] font-semibold text-sm">Moderate workload</p>
        <p className="text-[#94A3B8] text-sm mt-0.5">{range ? `${countLabel} due between ${range}` : `${countLabel} due soon`}</p>
      </div>
    </div>
  );
}
