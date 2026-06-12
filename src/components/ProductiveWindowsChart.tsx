"use client";

import { formatLocalHour } from "@/lib/time";

interface Props {
  data: Array<{ hour_of_day: number; day_of_week: number; score: number }>;
  userTz?: string;
}

function hourEmoji(h: number): string {
  if (h <= 5) return "🌙";
  if (h <= 11) return "🌅";
  if (h <= 16) return "☀️";
  if (h <= 20) return "🌆";
  return "🌙";
}

export default function ProductiveWindowsChart({ data, userTz }: Props) {
  if (data.length < 5) {
    return (
      <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5">
        <h2 className="text-[#F6F1E8] font-semibold text-sm">Best Time to Review</h2>
        <p className="text-[#7E8AA0] text-xs mt-1 mb-3">
          When you&apos;re most active on DuePulse
        </p>
        <p className="text-[#AAB4C4] text-sm">
          DuePulse is learning your focus patterns. Check back after a few more
          visits.
        </p>
      </div>
    );
  }

  const hourTotals = new Map<number, number>();
  for (const row of data) {
    hourTotals.set(
      row.hour_of_day,
      (hourTotals.get(row.hour_of_day) ?? 0) + row.score,
    );
  }
  const aggregated = Array.from(hourTotals.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const topHour = aggregated[0][0];
  const runnerUps = aggregated.slice(1, 3).map(([h]) => h);

  return (
    <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-[#F6F1E8] font-semibold text-sm">
            ⏰ Best Time to Review
          </h3>
          <p className="text-[#7E8AA0] text-xs mt-0.5">
            When you&apos;re most active on DuePulse
          </p>
        </div>

        {/* Peak hour highlight */}
        <div className="bg-[#1C2637] border border-[#D6B36A]/20 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">{hourEmoji(topHour)}</div>
          <div className="text-[#F6F1E8] font-bold text-xl">
            {formatLocalHour(topHour, userTz)}
          </div>
          <div className="text-[#D6B36A] text-xs mt-1 font-medium">
            Your peak focus hour
          </div>
        </div>

        {/* Runner-ups */}
        {runnerUps.length > 0 && (
          <div>
            <p className="text-[#7E8AA0] text-xs mb-2">Also active at:</p>
            <div className="flex gap-2">
              {runnerUps.map((h) => (
                <span
                  key={h}
                  className="bg-[#1C2637] border border-[#2A3444] text-[#AAB4C4] text-xs rounded-lg px-3 py-1.5 font-medium"
                >
                  {formatLocalHour(h, userTz)}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[#7E8AA0] text-xs">
          Updates every time you open DuePulse
        </p>
      </div>
    </div>
  );
}
