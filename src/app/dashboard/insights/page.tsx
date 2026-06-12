import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { analyzeProductiveWindows } from "@/lib/ml";
import { formatLocalHour } from "@/lib/time";
import BehavioralInsightCard from "@/components/BehavioralInsightCard";
import ProductiveWindowsChart from "@/components/ProductiveWindowsChart";

export const metadata = { title: "Insights — DuePulse" };

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NUDGE_TYPE_LABELS: Record<string, string> = {
  productive_window: "Productive Window",
  "12h": "12h Before Due",
  "6h": "6h Before Due",
  "1h": "1h Before Due",
};

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;

  const [{ data: pwRows }, { data: profile }, { data: nudgeLogs }] =
    await Promise.all([
      supabase
        .from("productive_windows")
        .select("hour_of_day, day_of_week, score")
        .eq("user_id", userId),
      supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userId)
        .single(),
      supabase
        .from("nudge_logs")
        .select("nudge_type")
        .eq("user_id", userId)
        .gte(
          "sent_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),
    ]);

  const userTz = profile?.timezone ?? "America/Chicago";
  const rows = pwRows ?? [];
  const insights = analyzeProductiveWindows(rows, userTz);
  const totalDaysTracked = (() => {
    const uniqueDays = new Set(rows.map((r) => r.day_of_week));
    return uniqueDays.size;
  })();

  // Nudge log summary
  const nudgeCounts = (nudgeLogs ?? []).reduce<Record<string, number>>(
    (acc, l) => {
      acc[l.nudge_type] = (acc[l.nudge_type] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const totalNudges = Object.values(nudgeCounts).reduce((a, b) => a + b, 0);

  // Build 7×24 activity grid
  const scoreGrid: Record<number, Record<number, number>> = {};
  for (const r of rows) {
    if (!scoreGrid[r.day_of_week]) scoreGrid[r.day_of_week] = {};
    scoreGrid[r.day_of_week][r.hour_of_day] = r.score;
  }
  const maxScore = Math.max(...rows.map((r) => r.score), 0.01);

  // Peak stats
  const peakRow = rows.length
    ? rows.reduce((best, r) => (r.score > best.score ? r : best), rows[0])
    : null;

  return (
    <>
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#2A3444] bg-[#0C111B] sticky top-0 z-30 h-[57px]">
        <div className="pl-14 lg:pl-0 px-5 h-full flex items-center">
          <h1 className="text-[#F6F1E8] font-semibold text-base">Insights</h1>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-5 py-6 sm:px-6 sm:py-7 max-w-7xl w-full mx-auto">
        {/* Not enough data state */}
        {rows.length < 5 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1C2637] border border-[#2A3444] flex items-center justify-center mb-5 text-2xl">
              🧠
            </div>
            <h2 className="text-[#F6F1E8] font-bold text-xl mb-2">
              Still learning your patterns
            </h2>
            <p className="text-[#7E8AA0] text-sm leading-relaxed max-w-xs">
              Visit DuePulse a few more times and your focus profile will appear
              here automatically.
            </p>
            <div className="mt-6 w-48">
              <div className="w-full h-1.5 bg-[#1C2637] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D6B36A] rounded-full"
                  style={{ width: `${Math.min((rows.length / 5) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[#7E8AA0] text-xs mt-2 text-center">
                {rows.length} of 5 sessions tracked
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Row 1: Focus Profile + Best Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <BehavioralInsightCard
                  insights={insights}
                  totalDaysTracked={totalDaysTracked}
                />
              </div>
              <ProductiveWindowsChart data={rows} userTz={userTz} />
            </div>

            {/* Row 2: Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Days tracked",
                  value: totalDaysTracked,
                  suffix: "",
                  color: "text-[#F6F1E8]",
                },
                {
                  label: "Peak hour",
                  value: peakRow
                    ? formatLocalHour(peakRow.hour_of_day, userTz)
                    : "—",
                  suffix: "",
                  color: "text-[#D6B36A]",
                },
                {
                  label: "Best days",
                  value: insights.bestDayLabels.join(", ") || "—",
                  suffix: "",
                  color: "text-[#7FAE9D]",
                },
                {
                  label: "Nudges this month",
                  value: totalNudges,
                  suffix: "",
                  color: "text-[#F6F1E8]",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5"
                >
                  <p className={`font-bold text-2xl leading-none ${color}`}>
                    {value}
                  </p>
                  <p className="text-[#7E8AA0] text-xs mt-2">{label}</p>
                </div>
              ))}
            </div>

            {/* Row 3: Activity heatmap (day × hour) */}
            <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5 sm:p-6 overflow-x-auto">
              <h2 className="text-[#F6F1E8] font-semibold text-base mb-1">
                Activity Heatmap
              </h2>
              <p className="text-[#7E8AA0] text-xs mb-5">
                When you open DuePulse — darker = more active
              </p>

              <div className="min-w-[560px]">
                {/* Hour labels */}
                <div className="flex items-center mb-1 ml-9">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      className="flex-1 text-center text-[10px] text-[#7E8AA0]"
                    >
                      {h % 6 === 0 ? `${h}h` : ""}
                    </div>
                  ))}
                </div>

                {/* Grid rows */}
                {DOW_SHORT.map((day, dow) => (
                  <div key={day} className="flex items-center gap-1 mb-1">
                    <span className="w-8 text-right text-[10px] text-[#7E8AA0] shrink-0">
                      {day}
                    </span>
                    <div className="flex flex-1 gap-px">
                      {Array.from({ length: 24 }, (_, h) => {
                        const score = scoreGrid[dow]?.[h] ?? 0;
                        const rel = score / maxScore;
                        const alpha = rel < 0.01 ? 0.04 : 0.08 + rel * 0.85;
                        return (
                          <div
                            key={h}
                            className="flex-1 rounded-[2px]"
                            style={{
                              aspectRatio: "1",
                              backgroundColor: `rgba(214,179,106,${alpha.toFixed(2)})`,
                              border:
                                score > 0 ? "none" : "1px solid rgba(42,52,68,0.5)",
                            }}
                            title={`${day} ${formatLocalHour(h, userTz)}: score ${(score * 100).toFixed(0)}%`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-2 mt-3 ml-9">
                  <span className="text-[#7E8AA0] text-[10px]">Less active</span>
                  <div className="flex gap-px">
                    {[0.04, 0.2, 0.4, 0.65, 0.93].map((a) => (
                      <div
                        key={a}
                        className="w-3 h-3 rounded-[2px]"
                        style={{ backgroundColor: `rgba(214,179,106,${a})` }}
                      />
                    ))}
                  </div>
                  <span className="text-[#7E8AA0] text-[10px]">More active</span>
                </div>
              </div>
            </div>

            {/* Row 4: Nudge summary */}
            {totalNudges > 0 && (
              <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-5 sm:p-6">
                <h2 className="text-[#F6F1E8] font-semibold text-base mb-1">
                  Nudge Summary
                </h2>
                <p className="text-[#7E8AA0] text-xs mb-5">
                  Push notifications sent to you in the last 30 days
                </p>
                <div className="flex flex-col gap-3">
                  {Object.entries(nudgeCounts).map(([type, count]) => {
                    const pct = Math.round((count / totalNudges) * 100);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#AAB4C4] text-sm">
                            {NUDGE_TYPE_LABELS[type] ?? type}
                          </span>
                          <span className="text-[#F6F1E8] text-sm font-medium">
                            {count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1C2637] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D6B36A] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[#7E8AA0] text-xs mt-4">
                  {totalNudges} total nudge{totalNudges !== 1 ? "s" : ""} this
                  month
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
