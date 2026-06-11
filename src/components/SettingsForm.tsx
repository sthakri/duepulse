"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

type SettingsFormProps = {
  saveSettings: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  pauseNotifications: (formData: FormData) => Promise<{ success?: boolean; error?: string; pausedUntil?: string | null }>;
  initialQuietStart: number | null;
  initialQuietEnd: number | null;
  initialFrequency: string;
  initialThreshold: number;
  initialPausedUntil: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12} ${period}`;
}

const FREQUENCIES = [
  {
    value: "aggressive",
    label: "Aggressive",
    desc: "Nudge at every productive window",
  },
  {
    value: "normal",
    label: "Normal",
    desc: "Max once per day during productive hours",
  },
  {
    value: "minimal",
    label: "Minimal",
    desc: "Only for deadline reminders within 24 hours",
  },
] as const;

const PAUSE_DURATIONS = [
  { hours: 1, label: "1h" },
  { hours: 4, label: "4h" },
  { hours: 24, label: "24h" },
] as const;

export default function SettingsForm({
  saveSettings,
  pauseNotifications,
  initialQuietStart,
  initialQuietEnd,
  initialFrequency,
  initialThreshold,
  initialPausedUntil,
}: SettingsFormProps) {
  const [quietEnabled, setQuietEnabled] = useState(
    initialQuietStart !== null && initialQuietEnd !== null,
  );
  const [quietStart, setQuietStart] = useState(initialQuietStart ?? 22);
  const [quietEnd, setQuietEnd] = useState(initialQuietEnd ?? 8);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [isPending, startTransition] = useTransition();
  const [isPausing, startPauseTransition] = useTransition();

  const [isPaused, setIsPaused] = useState(false);
  const [pausedRemaining, setPausedRemaining] = useState(0);
  const [pauseEnabled, setPauseEnabled] = useState(() => {
    if (!initialPausedUntil) return false;
    return new Date(initialPausedUntil).getTime() > Date.now();
  });
  const [activeDuration, setActiveDuration] = useState(1);

  useEffect(() => {
    function update() {
      if (!initialPausedUntil) {
        setIsPaused(false);
        setPausedRemaining(0);
        return;
      }
      const paused = new Date(initialPausedUntil).getTime() > Date.now();
      setIsPaused(paused);
      if (paused) {
        setPausedRemaining(
          Math.max(0, Math.round((new Date(initialPausedUntil).getTime() - Date.now()) / 60000)),
        );
      } else {
        setPausedRemaining(0);
        setPauseEnabled(false);
      }
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [initialPausedUntil]);

  function handleSave(formData: FormData) {
    formData.set("quiet_hours_enabled", quietEnabled ? "on" : "off");
    formData.set("quiet_hours_start", String(quietStart));
    formData.set("quiet_hours_end", String(quietEnd));
    formData.set("nudge_frequency", frequency);
    formData.set("stress_threshold", String(threshold));

    startTransition(async () => {
      const result = await saveSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings saved");
      }
    });
  }

  function handlePause(hours: number) {
    const fd = new FormData();
    fd.set("hours", String(hours));

    startPauseTransition(async () => {
      const result = await pauseNotifications(fd);
      if (result.error) {
        toast.error(result.error);
      } else if (hours === 0) {
        toast.success("Notifications resumed");
      } else {
        toast.success(`Notifications paused for ${hours}h`);
      }
    });
  }

  const timelineHours = Array.from({ length: 24 }, (_, i) => i);

  function isInQuietZone(hour: number): boolean {
    if (!quietEnabled) return false;
    if (quietStart === quietEnd) return hour === quietStart;
    if (quietStart < quietEnd) return hour >= quietStart && hour < quietEnd;
    return hour >= quietStart || hour < quietEnd;
  }

  return (
    <div className="flex flex-col gap-8">
      <form action={handleSave}>
        {/* ── Quiet Hours ────────────────────────────────────────────── */}
        <section className="rounded-xl bg-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Quiet Hours</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quietEnabled}
                onChange={(e) => setQuietEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:bg-indigo-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>

          {quietEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                    Start
                  </label>
                  <select
                    value={quietStart}
                    onChange={(e) => setQuietStart(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                    End
                  </label>
                  <select
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 24h Timeline Bar */}
              <div className="flex h-8 rounded-lg overflow-hidden border border-slate-700">
                {timelineHours.map((h) => (
                  <div
                    key={h}
                    className={`flex-1 flex items-center justify-center text-[10px] font-medium transition-colors ${
                      isInQuietZone(h)
                        ? "bg-red-500/20 text-red-400"
                        : "bg-indigo-500/10 text-slate-500"
                    }`}
                    title={`${formatHour(h)}`}
                  >
                    {h % 3 === 0 ? formatHour(h).split(" ")[0] : ""}
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-xs mt-2">
                Red = quiet hours &mdash; no notifications will be sent
              </p>
            </>
          )}

          {!quietEnabled && (
            <p className="text-slate-400 text-sm">
              Notifications will be sent at any hour
            </p>
          )}
        </section>

        {/* ── Nudge Frequency ────────────────────────────────────────── */}
        <section className="rounded-xl bg-slate-800 p-5 mt-6">
          <h2 className="text-white font-semibold text-lg mb-4">
            Nudge Frequency
          </h2>
          <div className="flex flex-col gap-3">
            {FREQUENCIES.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                  frequency === opt.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-700 bg-slate-700/30 hover:bg-slate-700/50"
                }`}
              >
                <input
                  type="radio"
                  name="nudge_frequency"
                  value={opt.value}
                  checked={frequency === opt.value}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <p className="text-white text-sm font-medium">{opt.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* ── Workload Alert Threshold ───────────────────────────────── */}
        <section className="rounded-xl bg-slate-800 p-5 mt-6">
          <h2 className="text-white font-semibold text-lg mb-4">
            Workload Alert Threshold
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={1}
              max={20}
              value={threshold}
              onChange={(e) =>
                setThreshold(
                  Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)),
                )
              }
              className="w-16 rounded-lg bg-slate-700 border border-slate-600 text-white text-center text-lg font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-slate-300 text-sm">
              You&apos;ll see a stress alert when{" "}
              <span className="text-white font-semibold">{threshold}+</span>{" "}
              assignments are due in the next 14 days
            </p>
          </div>
        </section>

        {/* ── Save ───────────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 transition-colors"
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>

      {/* ── Pause Notifications ──────────────────────────────────────── */}
      <section className="rounded-xl bg-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">
            Pause Notifications
          </h2>
          <div className="flex items-center gap-3">
            {isPaused && (
              <span className="text-xs text-amber-400 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full">
                {pausedRemaining}m remaining
              </span>
            )}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pauseEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setPauseEnabled(enabled);
                  if (enabled) {
                    handlePause(activeDuration);
                  } else {
                    handlePause(0);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:bg-indigo-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Temporarily silence all nudges. Your preferences will resume
          automatically.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            pauseEnabled ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex gap-3 pt-1">
            {PAUSE_DURATIONS.map((opt) => (
              <button
                key={opt.hours}
                type="button"
                disabled={isPausing}
                onClick={() => {
                  setActiveDuration(opt.hours);
                  handlePause(opt.hours);
                }}
                className={`flex-1 rounded-lg border text-sm font-medium px-3 py-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeDuration === opt.hours
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-sm shadow-indigo-500/20"
                    : "border-slate-600 text-slate-400 bg-slate-700/30 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
