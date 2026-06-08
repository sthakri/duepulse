import { schedules } from "@trigger.dev/sdk/v3"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import { generateNudge } from "@/lib/nim"
import { sendPushNotification } from "@/lib/webpush"
import type { Database } from "@/database.types"
import webpush from "web-push"
import ws from "ws"

// ── Deadline threshold definitions ────────────────────────────────────────────
type DeadlineType = "12h" | "6h" | "1h"

const DEADLINE_THRESHOLDS: Array<{
  type: DeadlineType
  label: string
  notifTitle: string
  minMs: number
  maxMs: number
}> = [
  {
    type: "12h",
    label: "~12 hours",
    notifTitle: "Due in ~12 Hours ⏰",
    minMs: 11 * 3_600_000,
    maxMs: 13 * 3_600_000,
  },
  {
    type: "6h",
    label: "~6 hours",
    notifTitle: "Due in ~6 Hours ⚡",
    minMs: 5 * 3_600_000,
    maxMs: 7 * 3_600_000,
  },
  {
    type: "1h",
    label: "1 hour",
    notifTitle: "Due in 1 Hour 🚨",
    minMs: 30 * 60_000,
    maxMs: 90 * 60_000,
  },
]

function buildDeadlineMessage(
  assignments: { title: string }[],
  label: string,
): string {
  if (assignments.length === 1)
    return `${assignments[0].title} is due in ${label}!`
  if (assignments.length === 2)
    return `${assignments[0].title} and ${assignments[1].title} are due in ${label}!`
  const rest = assignments.length - 2
  return `${assignments[0].title}, ${assignments[1].title}, and ${rest} more due in ${label}!`
}

// Maps en-US short weekday names → JS day-of-week numbers (0 = Sun … 6 = Sat)
const DAY_NAMES: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

// ─────────────────────────────────────────────────────────────────────────────

export const nudgeEngine = schedules.task({
  id: "send-nudges",
  cron: "0 * * * *",
  run: async (_payload) => {
    if (env.NUDGE_ENABLED !== "true") {
      console.log("[nudge-engine] Nudges disabled (NUDGE_ENABLED != true). Skipping.")
      return
    }

    const now = new Date()
    console.log(`[nudge-engine] Run started at ${now.toISOString()}`)

    const serviceClient = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        realtime: { transport: ws as unknown as typeof WebSocket },
      },
    )

    // Fetch productive windows and push subscriptions in parallel.
    const [windowsResult, subsResult] = await Promise.all([
      serviceClient
        .from("productive_windows")
        .select("user_id, hour_of_day, day_of_week")
        .gt("score", 0),
      serviceClient
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth"),
    ])

    const allWindows = windowsResult.data ?? []
    const allSubs = subsResult.data ?? []
    const subsByUser = new Map(allSubs.map((s) => [s.user_id, s]))

    console.log(`[nudge-engine] productive_windows rows: ${allWindows.length}, push_subscriptions rows: ${allSubs.length}`)
    if (windowsResult.error) console.error("[nudge-engine] productive_windows query error:", windowsResult.error)
    if (subsResult.error) console.error("[nudge-engine] push_subscriptions query error:", subsResult.error)

    // ── Section A: Productive Window Nudges ───────────────────────────────────
    // Fire only during the user's local productive day+hour, at most once per 20h.

    const uniqueUserIds = [...new Set(allWindows.map((w) => w.user_id))]

    const { data: userProfiles } = await serviceClient
      .from("profiles")
      .select("id, timezone")
      .in("id", uniqueUserIds)

    const tzByUser = new Map(
      (userProfiles ?? []).map((p) => [p.id, p.timezone ?? "America/Chicago"]),
    )

    // Key: "${day_of_week}:${hour_of_day}" — must match both day AND hour, not just hour.
    const windowsByUser = new Map<string, Set<string>>()
    for (const w of allWindows) {
      if (!windowsByUser.has(w.user_id)) windowsByUser.set(w.user_id, new Set())
      windowsByUser.get(w.user_id)!.add(`${w.day_of_week}:${w.hour_of_day}`)
    }

    const productiveUserIds = uniqueUserIds.filter((uid) => {
      const tz = tzByUser.get(uid) ?? "America/Chicago"
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hourCycle: "h23",
        weekday: "short",
      }).formatToParts(now)
      const localHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
      const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun"
      const localDay = DAY_NAMES[weekdayStr] ?? 0
      const key = `${localDay}:${localHour}`
      const matches = windowsByUser.get(uid)?.has(key) ?? false
      console.log(`[nudge-engine] Section A uid=${uid} tz=${tz} day=${localDay} hour=${localHour} key=${key} matches=${matches}`)
      return matches
    })

    // Extended to 14 days so assignments due next week are always found.
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000)

    console.log(`[nudge-engine] Section A: ${productiveUserIds.length} user(s) in productive window`)
    let productiveWindowSent = 0

    const sectionAResults = await Promise.allSettled(
      productiveUserIds.map(async (userId) => {
        const sub = subsByUser.get(userId)
        if (!sub) {
          console.log(`[nudge-engine] Section A uid=${userId} no push subscription — skipping`)
          return
        }

        // Dedup: skip if a productive_window nudge was already sent in the last 20 hours.
        const { data: recentLog } = await serviceClient
          .from("nudge_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("nudge_type", "productive_window")
          .gte("sent_at", twentyHoursAgo.toISOString())
          .maybeSingle()

        if (recentLog) {
          console.log(`[nudge-engine] Section A uid=${userId} dedup hit — nudge already sent in last 20h`)
          return
        }

        // Fetch up to 3 upcoming incomplete assignments due within 14 days (pass nearest to NIM).
        const { data: assignments, error: assignmentsError } = await serviceClient
          .from("assignments")
          .select("id, title, due_at, courses(name)")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .gt("due_at", now.toISOString())
          .lt("due_at", fourteenDaysFromNow.toISOString())
          .order("due_at", { ascending: true })
          .limit(3)

        if (assignmentsError) {
          console.error(`[nudge-engine] Section A uid=${userId} assignments query error:`, assignmentsError)
          return
        }
        console.log(`[nudge-engine] Section A uid=${userId} upcoming assignments (14d window): ${assignments?.length ?? 0}`)
        if (!assignments || assignments.length === 0) return

        const nearest = assignments[0]
        if (!nearest.due_at) return

        const courseName =
          (nearest.courses as { name: string } | null)?.name ?? "Unknown Course"

        console.log(`[nudge-engine] Section A uid=${userId} calling generateNudge for "${nearest.title}" (${courseName})`)
        const nudgeText = await generateNudge(
          nearest.title,
          nearest.due_at,
          courseName,
        )
        console.log(`[nudge-engine] Section A uid=${userId} nudge text: "${nudgeText}"`)

        const subscription: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }

        console.log(`[nudge-engine] Section A uid=${userId} sending push notification`)
        await sendPushNotification(subscription, nudgeText)
        productiveWindowSent++
        console.log(`[nudge-engine] Section A uid=${userId} push sent successfully ✓`)

        await serviceClient.from("nudge_logs").insert({
          user_id: userId,
          assignment_id: nearest.id,
          nudge_type: "productive_window",
          sent_at: now.toISOString(),
        })
      }),
    )

    for (let i = 0; i < sectionAResults.length; i++) {
      const r = sectionAResults[i]
      if (r.status === "rejected") {
        console.error(`[nudge-engine] Section A uid=${productiveUserIds[i]} threw:`, r.reason)
      }
    }
    console.log(`[nudge-engine] Section A done: productive_window_sent=${productiveWindowSent}`)

    // ── Section B: Deadline Nudges ────────────────────────────────────────────
    // Fire for ALL users with push subscriptions, regardless of productive hours.
    // Thresholds: 12h (±1h window), 6h (±1h window), 1h (±30m window).

    const thirteenHoursFromNow = new Date(now.getTime() + 13 * 3_600_000)
    let deadlineSent = 0

    console.log(`[nudge-engine] Section B: processing ${allSubs.length} push subscription(s)`)
    const sectionBResults = await Promise.allSettled(
      allSubs.map(async (sub) => {
        const userId = sub.user_id

        // Fetch all incomplete assignments due within the widest threshold window.
        const { data: upcomingAssignments } = await serviceClient
          .from("assignments")
          .select("id, title, due_at")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .gt("due_at", now.toISOString())
          .lte("due_at", thirteenHoursFromNow.toISOString())
          .order("due_at", { ascending: true })

        console.log(`[nudge-engine] Section B uid=${userId} assignments in 13h window: ${upcomingAssignments?.length ?? 0}`)
        if (!upcomingAssignments || upcomingAssignments.length === 0) return

        // Fetch already-sent deadline logs for this user's upcoming assignments.
        const assignmentIds = upcomingAssignments.map((a) => a.id)
        const { data: sentLogs } = await serviceClient
          .from("nudge_logs")
          .select("assignment_id, nudge_type")
          .eq("user_id", userId)
          .in("assignment_id", assignmentIds)
          .in("nudge_type", ["12h", "6h", "1h"])

        const sentSet = new Set(
          (sentLogs ?? []).map((l) => `${l.assignment_id}:${l.nudge_type}`),
        )

        for (const threshold of DEADLINE_THRESHOLDS) {
          // Filter assignments hitting this threshold window.
          const inWindow = upcomingAssignments.filter((a) => {
            if (!a.due_at) return false
            const ms = new Date(a.due_at).getTime() - now.getTime()
            return ms >= threshold.minMs && ms <= threshold.maxMs
          })

          // Remove any already logged (dedup via partial unique index).
          const toSend = inWindow.filter(
            (a) => !sentSet.has(`${a.id}:${threshold.type}`),
          )
          if (toSend.length === 0) continue

          const message = buildDeadlineMessage(toSend, threshold.label)

          const subscription: webpush.PushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }

          console.log(`[nudge-engine] Section B uid=${userId} sending ${threshold.type} deadline nudge for ${toSend.length} assignment(s)`)
          await sendPushNotification(subscription, message, threshold.notifTitle)
          deadlineSent++
          console.log(`[nudge-engine] Section B uid=${userId} ${threshold.type} push sent successfully ✓`)

          // Insert one nudge_log row per assignment covered by this notification.
          await serviceClient.from("nudge_logs").insert(
            toSend.map((a) => ({
              user_id: userId,
              assignment_id: a.id,
              nudge_type: threshold.type,
              sent_at: now.toISOString(),
            })),
          )
        }
      }),
    )

    for (let i = 0; i < sectionBResults.length; i++) {
      const r = sectionBResults[i]
      if (r.status === "rejected") {
        console.error(`[nudge-engine] Section B uid=${allSubs[i].user_id} threw:`, r.reason)
      }
    }
    console.log(`[nudge-engine] Section B done: deadline_sent=${deadlineSent}`)

    return { productive_window_sent: productiveWindowSent, deadline_sent: deadlineSent }
  },
})
