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
  high: { dot: "bg-emerald-400", badge: "text-emerald-400", bar: "bg-emerald-400" },
  medium: { dot: "bg-amber-400", badge: "text-amber-400", bar: "bg-amber-400" },
  low: { dot: "bg-slate-500", badge: "text-slate-500", bar: "bg-slate-500" },
};

export default function BehavioralInsightCard({
  insights,
  totalDaysTracked,
}: Props) {
  const { patterns, persona, topFocusBlock, bestDayLabels } = insights;

  if (totalDaysTracked < 3) {
    const pct = Math.min((totalDaysTracked / 3) * 100, 100);
    return (
      <div className="rounded-xl bg-slate-800 p-4">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          🧠 Your Focus Windows
        </h2>
        <p className="text-slate-300 text-sm mt-2">
          DuePulse is learning your patterns. Visit a few more times to unlock
          your focus profile.
        </p>

        <div className="mt-4">
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.max(pct, 4)}%` }}
            />
          </div>
          <p className="text-slate-400 text-xs mt-1.5">
            {totalDaysTracked} of 3 days tracked
          </p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...patterns.map((p) => p.avgScore), 0.01);
  const topThree = patterns.slice(0, 3);

  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-white font-semibold text-lg">Your Focus Windows</h2>
        {persona && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300 shrink-0">
            {persona.emoji} {persona.label}
          </span>
        )}
      </div>

      {persona && (
        <p className="text-slate-400 text-xs mt-1">{persona.description}</p>
      )}

      {topFocusBlock && (
        <div className="mt-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            Power Block
          </p>
          <p className="text-white font-semibold text-sm mt-0.5">
            {topFocusBlock.label}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {topThree.map((p) => {
          const colors = CONFIDENCE_COLORS[p.confidence];
          const barWidth = (p.avgScore / maxScore) * 100;
          return (
            <div key={p.hour} className="flex items-center gap-2.5">
              <span className="text-slate-300 text-xs w-14 shrink-0">
                {p.label}
              </span>

              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
        <p className="text-slate-500 text-xs mt-4">
          Most active: {bestDayLabels.join(", ")}
        </p>
      )}
    </div>
  );
}
