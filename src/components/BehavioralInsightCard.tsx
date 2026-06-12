"use client";

import type { MLInsights } from "@/lib/ml";

interface Props {
  insights: MLInsights;
  totalDaysTracked: number;
}

const CONFIDENCE_COLORS: Record<
  string,
  { dot: string; badge: string; bar: string }
> = {
  high: { dot: "bg-[#7FAE9D]", badge: "text-[#7FAE9D]", bar: "bg-[#7FAE9D]" },
  medium: { dot: "bg-[#D6B36A]", badge: "text-[#D6B36A]", bar: "bg-[#D6B36A]" },
  low: { dot: "bg-[#7E8AA0]", badge: "text-[#7E8AA0]", bar: "bg-[#7E8AA0]" },
};

export default function BehavioralInsightCard({
  insights,
  totalDaysTracked,
}: Props) {
  const { patterns, persona, topFocusBlock, bestDayLabels } = insights;

  if (totalDaysTracked < 3) {
    const pct = Math.min((totalDaysTracked / 3) * 100, 100);
    return (
      <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5">
        <h2 className="text-[#F6F1E8] font-semibold text-sm flex items-center gap-2">
          🧠 Your Focus Windows
        </h2>
        <p className="text-[#AAB4C4] text-sm mt-2">
          DuePulse is learning your patterns. Visit a few more times to unlock
          your focus profile.
        </p>

        <div className="mt-4">
          <div className="w-full h-1.5 bg-[#1C2637] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D6B36A] rounded-full transition-all"
              style={{ width: `${Math.max(pct, 4)}%` }}
            />
          </div>
          <p className="text-[#7E8AA0] text-xs mt-1.5">
            {totalDaysTracked} of 3 days tracked
          </p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...patterns.map((p) => p.avgScore), 0.01);
  const topThree = patterns.slice(0, 3);

  return (
    <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-[#F6F1E8] font-semibold text-sm">Your Focus Windows</h2>
        {persona && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#D6B36A]/10 border border-[#D6B36A]/20 px-2.5 py-1 text-xs font-medium text-[#D6B36A] shrink-0">
            {persona.emoji} {persona.label}
          </span>
        )}
      </div>

      {persona && (
        <p className="text-[#7E8AA0] text-xs mb-4">{persona.description}</p>
      )}

      {/* Power block */}
      {topFocusBlock && (
        <div className="mb-4 rounded-xl bg-[#1C2637] border border-[#D6B36A]/15 p-3">
          <p className="text-[#D6B36A] text-xs font-semibold uppercase tracking-wider">
            Power Block
          </p>
          <p className="text-[#F6F1E8] font-semibold text-sm mt-0.5">
            {topFocusBlock.label}
          </p>
        </div>
      )}

      {/* Bars */}
      <div className="space-y-2.5">
        {topThree.map((p) => {
          const colors = CONFIDENCE_COLORS[p.confidence];
          const barWidth = (p.avgScore / maxScore) * 100;
          return (
            <div key={p.hour} className="flex items-center gap-2.5">
              <span className="text-[#AAB4C4] text-xs w-14 shrink-0">
                {p.label}
              </span>

              <div className="flex-1 h-1.5 bg-[#1C2637] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bar}`}
                  style={{ width: `${Math.max(barWidth, 4)}%` }}
                />
              </div>

              <span
                className={`text-xs font-medium w-12 text-right shrink-0 ${colors.badge}`}
              >
                {p.confidence.charAt(0).toUpperCase() + p.confidence.slice(1)}
              </span>
            </div>
          );
        })}
      </div>

      {bestDayLabels.length > 0 && (
        <p className="text-[#7E8AA0] text-xs mt-4">
          Most active: {bestDayLabels.join(", ")}
        </p>
      )}
    </div>
  );
}
