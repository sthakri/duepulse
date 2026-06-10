import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
});

function formatLocalDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

function toDateOnly(localDateStr: string): Date {
  const [y, m, d] = localDateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await ratelimit.limit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const userTz = profile?.timezone ?? "America/Chicago";

  const now = new Date();
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data: assignments } = await supabase
    .from("assignments")
    .select("due_at, points_possible")
    .eq("user_id", user.id)
    .eq("is_completed", false)
    .not("due_at", "is", null)
    .gte("due_at", now.toISOString())
    .lte("due_at", fourteenDaysLater.toISOString())
    .order("due_at", { ascending: true });

  const totalUpcoming = assignments?.length ?? 0;

  if (!assignments || totalUpcoming === 0) {
    return NextResponse.json({
      stressLevel: "low",
      pileUpDetected: false,
      peakWindowStart: null,
      peakWindowEnd: null,
      assignmentCount: 0,
      totalUpcoming: 0,
    });
  }

  const todayStr = formatLocalDate(now, userTz);
  const today = toDateOnly(todayStr);

  const dateCounts = new Map<string, number>();

  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const key = formatLocalDate(d, "UTC");
    dateCounts.set(key, 0);
  }

  for (const a of assignments) {
    if (!a.due_at) continue;
    const localDate = formatLocalDate(new Date(a.due_at), userTz);
    dateCounts.set(localDate, (dateCounts.get(localDate) ?? 0) + 1);
  }

  const sortedDates = Array.from(dateCounts.keys()).sort();
  const dateArray = sortedDates.map((d) => ({ date: d, count: dateCounts.get(d)! }));

  let stressLevel: "low" | "medium" | "high" = "low";
  let pileUpDetected = false;
  let maxWindowCount = 0;
  let peakStartIdx = -1;

  for (let i = 0; i < dateArray.length; i++) {
    let window3Count = 0;
    for (let j = i; j < Math.min(i + 3, dateArray.length); j++) {
      window3Count += dateArray[j].count;
    }

    if (window3Count > maxWindowCount) {
      maxWindowCount = window3Count;
      peakStartIdx = i;
    }

    if (window3Count >= 3 && stressLevel !== "high") {
      stressLevel = "high";
    }

    if (i + 5 <= dateArray.length) {
      let window5Count = 0;
      for (let j = i; j < i + 5; j++) {
        window5Count += dateArray[j].count;
      }
      if (window5Count >= 5) {
        pileUpDetected = true;
      }
    }
  }

  if (stressLevel === "low" && !pileUpDetected) {
    for (const { count } of dateArray) {
      if (count >= 2) {
        stressLevel = "medium";
        break;
      }
    }
  }

  let peakWindowStart: string | null = null;
  let peakWindowEnd: string | null = null;

  if (peakStartIdx >= 0) {
    peakWindowStart = sortedDates[peakStartIdx];
    const endIdx = Math.min(peakStartIdx + 2, sortedDates.length - 1);
    peakWindowEnd = sortedDates[endIdx];
  }

  const result: {
    stressLevel: "low" | "medium" | "high";
    pileUpDetected: boolean;
    peakWindowStart: string | null;
    peakWindowEnd: string | null;
    assignmentCount: number;
    totalUpcoming: number;
  } = {
    stressLevel,
    pileUpDetected,
    peakWindowStart,
    peakWindowEnd,
    assignmentCount: maxWindowCount,
    totalUpcoming,
  };

  return NextResponse.json(result);
}
