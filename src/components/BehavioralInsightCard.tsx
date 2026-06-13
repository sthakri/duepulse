"use client";

import type { MLInsights } from "@/lib/ml";

interface Props { insights: MLInsights; totalDaysTracked: number }

const CONFIDENCE_COLORS: Record<string, { dot: string; badge: string; bar: string }> = {
  high: { dot: "bg-[#10B981]", badge: "text-[#10B981]", bar: "bg-[#10B981]" },
  medium: { dot: "bg-[#6366F1]", badge: "text-[#818CF8]", bar: "bg-[#6366F1]" },
  low: { dot: "bg-[#64748B]", badge: "text-[#64748B]", bar: "bg-[#64748B]" },
};

export default function BehavioralInsightCard({ insights, totalDaysTracked }: Props) {
  const { patterns, persona, topFocusBlock, bestDayLabels } = insights;

  if (totalDaysTracked < 3) {
    const pct = Math.min((totalDaysTracked / 3) * 100, 100);
    return (
      <div className="rounded-[18px] bg-[#1E293B] border border-[#334155]/70 p-5">
        <h2 className="text-[#F8FAFC] font-semibold text-sm flex items-center gap-2">🧠 Your Focus Windows</h2>
        <p className="text-[#94A3B8] text-sm mt-2">DuePulse is learning your patterns. Visit a few more times to unlock your focus profile.</p>
        <div className="mt-4">
          <div className="w-full h-1.5 bg-[#243044] rounded-full overflow-hidden">
            <div className="h-full bg-[#6366F1] rounded-full transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
          <p className="text-[#64748B] text-xs mt-1.5">{totalDaysTracked} of 3 days tracked</p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...patterns.map((p) => p.avgScore), 0.01);
  const topThree = patterns.slice(0, 3);

  return (
    <div className="rounded-[18px] bg-[#1E293B] border border-[#334155]/70 p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-[#F8FAFC] font-semibold text-sm">Your Focus Windows</h2>
        {persona && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 px-2.5 py-1 text-xs font-medium text-[#818CF8] shrink-0">
            {persona.emoji} {persona.label}
          </span>
        )}
      </div>

      {persona && <p className="text-[#64748B] text-xs mb-4">{persona.description}</p>}

      {topFocusBlock && (
        <div className="mb-4 rounded-xl bg-[#243044] border border-[#6366F1]/15 p-3">
          <p className="text-[#818CF8] text-xs font-semibold uppercase tracking-wider">Power Block</p>
          <p className="text-[#F8FAFC] font-semibold text-sm mt-0.5">{topFocusBlock.label}</p>
        </div>
      )}

      <div className="space-y-2.5">
        {topThree.map((p) => {
          const colors = CONFIDENCE_COLORS[p.confidence];
          const barWidth = (p.avgScore / maxScore) * 100;
          return (
            <div key={p.hour} className="flex items-center gap-2.5">
              <span className="text-[#94A3B8] text-xs w-14 shrink-0">{p.label}</span>
              <div className="flex-1 h-1.5 bg-[#243044] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.max(barWidth, 4)}%` }} />
              </div>
              <span className={`text-xs font-medium w-12 text-right shrink-0 ${colors.badge}`}>
                {p.confidence.charAt(0).toUpperCase() + p.confidence.slice(1)}
              </span>
            </div>
          );
        })}
      </div>

      {bestDayLabels.length > 0 && (
        <p className="text-[#64748B] text-xs mt-4">Most active: {bestDayLabels.join(", ")}</p>
      )}
    </div>
  );
}
