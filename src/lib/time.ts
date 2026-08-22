const DAY_NAMES: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const SERVER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";

export function getDefaultTimezone(): string {
  if (typeof window !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SERVER_TIMEZONE;
  }
  return SERVER_TIMEZONE;
}

export function getLocalDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

export function getLocalHour(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
}

export function getLocalDay(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).formatToParts(date);
  return DAY_NAMES[parts.find((p) => p.type === "weekday")?.value ?? "Sun"] ?? 0;
}

export function formatLocalHour(hour: number, tz?: string): string {
  const normHour = ((hour % 24) + 24) % 24;
  const period = normHour >= 12 ? "PM" : "AM";
  const h12 = normHour === 0 ? 12 : normHour > 12 ? normHour - 12 : normHour;
  const timeStr = `${h12} ${period}`;
  if (!tz) return timeStr;
  try {
    const abbr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? "";
    return abbr ? `${timeStr} ${abbr}` : timeStr;
  } catch {
    return timeStr;
  }
}

export function getDayRange(date: Date, tz: string, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(date.getTime() + i * 86_400_000);
    result.push(getLocalDate(dt, tz));
  }
  return result;
}
