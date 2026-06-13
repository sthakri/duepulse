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
  { value: "aggressive", label: "Aggressive", desc: "Nudge at every productive window" },
  { value: "normal", label: "Normal", desc: "Max once per day during productive hours" },
  { value: "minimal", label: "Minimal", desc: "Only for deadline reminders within 24 hours" },
] as const;

const PAUSE_DURATIONS = [
  { hours: 1, label: "1h" },
  { hours: 4, label: "4h" },
  { hours: 24, label: "24h" },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] bg-[#1E293B] border border-[#334155]/70 p-5 sm:p-6">
      <h2 className="text-[#F8FAFC] font-semibold text-base mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-[#334155] rounded-full peer peer-checked:bg-[#6366F1] transition-colors after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
    </label>
  );
}

export default function SettingsForm({
  saveSettings,
  pauseNotifications,
  initialQuietStart,
  initialQuietEnd,
  initialFrequency,
  initialThreshold,
  initialPausedUntil,
}: SettingsFormProps) {
  const [quietEnabled, setQuietEnabled] = useState(initialQuietStart !== null && initialQuietEnd !== null);
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
      if (!initialPausedUntil) { setIsPaused(false); setPausedRemaining(0); return; }
      const paused = new Date(initialPausedUntil).getTime() > Date.now();
      setIsPaused(paused);
      if (paused) {
        setPausedRemaining(Math.max(0, Math.round((new Date(initialPausedUntil).getTime() - Date.now()) / 60000)));
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
      if (result.error) toast.error(result.error);
      else toast.success("Settings saved");
    });
  }

  function handlePause(hours: number) {
    const fd = new FormData();
    fd.set("hours", String(hours));
    startPauseTransition(async () => {
      const result = await pauseNotifications(fd);
      if (result.error) toast.error(result.error);
      else if (hours === 0) toast.success("Notifications resumed");
      else toast.success(`Notifications paused for ${hours}h`);
    });
  }

  function isInQuietZone(hour: number): boolean {
    if (!quietEnabled) return false;
    if (quietStart === quietEnd) return hour === quietStart;
    if (quietStart < quietEnd) return hour >= quietStart && hour < quietEnd;
    return hour >= quietStart || hour < quietEnd;
  }

  const selectCls = "w-full rounded-xl bg-[#0F172A] border border-[#334155] text-[#F8FAFC] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6366F1]";

  return (
    <div className="flex flex-col gap-5">
      <form action={handleSave}>
        {/* Quiet Hours */}
        <Section title="Quiet Hours">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#94A3B8] text-sm">Block notifications during these hours</p>
            <Toggle checked={quietEnabled} onChange={setQuietEnabled} />
          </div>
          {quietEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[#64748B] text-xs font-semibold uppercase tracking-widest block mb-1.5">Start</label>
                  <select value={quietStart} onChange={(e) => setQuietStart(Number(e.target.value))} className={selectCls}>
                    {HOURS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#64748B] text-xs font-semibold uppercase tracking-widest block mb-1.5">End</label>
                  <select value={quietEnd} onChange={(e) => setQuietEnd(Number(e.target.value))} className={selectCls}>
                    {HOURS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex h-7 rounded-lg overflow-hidden border border-[#334155]">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className={`flex-1 flex items-center justify-center text-[9px] font-medium transition-colors ${isInQuietZone(h) ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-[#6366F1]/6 text-[#64748B]"}`} title={formatHour(h)}>
                    {h % 6 === 0 ? String(h) : ""}
                  </div>
                ))}
              </div>
              <p className="text-[#64748B] text-xs mt-2">Red = quiet — no notifications sent</p>
            </>
          )}
          {!quietEnabled && <p className="text-[#64748B] text-sm">Notifications can be sent at any hour</p>}
        </Section>

        {/* Nudge Frequency */}
        <Section title="Nudge Frequency">
          <div className="flex flex-col gap-3">
            {FREQUENCIES.map((opt) => (
              <label key={opt.value} className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${frequency === opt.value ? "border-[#6366F1]/40 bg-[#6366F1]/8" : "border-[#334155] bg-[#243044]/50 hover:bg-[#243044]"}`}>
                <input type="radio" name="nudge_frequency" value={opt.value} checked={frequency === opt.value} onChange={(e) => setFrequency(e.target.value)} className="mt-0.5" style={{ accentColor: "#6366F1" }} />
                <div>
                  <p className={`text-sm font-medium ${frequency === opt.value ? "text-[#818CF8]" : "text-[#F8FAFC]"}`}>{opt.label}</p>
                  <p className="text-[#64748B] text-xs mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* Stress Threshold */}
        <Section title="Workload Alert Threshold">
          <div className="flex items-center gap-4">
            <input
              type="number" min={1} max={20} value={threshold}
              onChange={(e) => setThreshold(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
              className="w-16 rounded-xl bg-[#0F172A] border border-[#334155] text-[#F8FAFC] text-center text-lg font-semibold px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            />
            <p className="text-[#94A3B8] text-sm">
              Show a stress alert when <span className="text-[#F8FAFC] font-semibold">{threshold}+</span> assignments are due in the next 14 days
            </p>
          </div>
        </Section>

        <div className="flex justify-end">
          <button type="submit" disabled={isPending} className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 transition-colors shadow-[0_8px_25px_rgba(99,102,241,0.25)]">
            {isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Pause Notifications */}
      <Section title="Pause Notifications">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#94A3B8] text-sm">Temporarily silence all nudges</p>
          <div className="flex items-center gap-3">
            {isPaused && (
              <span className="text-xs text-[#818CF8] font-medium bg-[#6366F1]/10 px-2.5 py-1 rounded-full">
                {pausedRemaining}m remaining
              </span>
            )}
            <Toggle checked={pauseEnabled} onChange={(enabled) => { setPauseEnabled(enabled); if (enabled) handlePause(activeDuration); else handlePause(0); }} />
          </div>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${pauseEnabled ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex gap-3 pt-1">
            {PAUSE_DURATIONS.map((opt) => (
              <button key={opt.hours} type="button" disabled={isPausing}
                onClick={() => { setActiveDuration(opt.hours); handlePause(opt.hours); }}
                className={`flex-1 rounded-xl border text-sm font-medium px-3 py-2.5 transition-all disabled:opacity-50 ${activeDuration === opt.hours ? "border-[#6366F1]/40 bg-[#6366F1]/12 text-[#818CF8]" : "border-[#334155] text-[#64748B] bg-[#243044]/50 hover:border-[#475569] hover:text-[#94A3B8]"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
