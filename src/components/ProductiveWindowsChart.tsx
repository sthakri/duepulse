"use client";

interface Props {
  data: Array<{ hour_of_day: number; day_of_week: number; score: number }>;
}

function formatHour(h: number): string {
  return new Date(0, 0, 0, h).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

function hourEmoji(h: number): string {
  if (h <= 5) return "🌙";
  if (h <= 11) return "🌅";
  if (h <= 16) return "☀️";
  if (h <= 20) return "🌆";
  return "🌙";
}

export default function ProductiveWindowsChart({ data }: Props) {
  if (data.length < 5) {
    return (
      <div className="rounded-xl bg-slate-800 p-4">
        <h2 className="text-white font-semibold">Your Focus Windows</h2>
        <p className="text-slate-400 text-xs mt-1 mb-3">
          Hours when you visit DuePulse most — best times to review assignments
        </p>
        <p className="text-slate-400 text-sm">
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
    <div className="rounded-xl bg-slate-800 p-4">
      <div className="space-y-3">
        <div>
          <h3 className="text-white font-semibold text-sm">
            ⏰ Best Time to Review
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            When you&apos;re most active on DuePulse
          </p>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">{hourEmoji(topHour)}</div>
          <div className="text-white font-bold text-xl">
            {formatHour(topHour)}
          </div>
          <div className="text-indigo-400 text-xs mt-1">
            Your peak focus hour
          </div>
        </div>

        {runnerUps.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs mb-1.5">Also active at:</p>
            <div className="flex gap-2">
              {runnerUps.map((h) => (
                <span
                  key={h}
                  className="bg-slate-700 text-slate-300 text-xs rounded-md px-2 py-1"
                >
                  {formatHour(h)}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-slate-600 text-xs">
          Updates every time you open DuePulse
        </p>
      </div>
    </div>
  );
}
