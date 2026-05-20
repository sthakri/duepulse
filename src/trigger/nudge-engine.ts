import { schedules } from "@trigger.dev/sdk/v3"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import { generateNudge } from "@/lib/openai"
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

// ─────────────────────────────────────────────────────────────────────────────

export const nudgeEngine = schedules.task({
  id: "send-nudges",
  cron: "0 * * * *",
  run: async (_payload) => {
    const now = new Date()

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
        .select("user_id, hour_of_day")
        .gt("score", 0),
      serviceClient
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth"),
    ])

    const allWindows = windowsResult.data ?? []
    const allSubs = subsResult.data ?? []
    const subsByUser = new Map(allSubs.map((s) => [s.user_id, s]))

    // ── Section A: Productive Window Nudges ───────────────────────────────────
    // Fire only during the user's local productive hours, at most once per 20h.

    const uniqueUserIds = [...new Set(allWindows.map((w) => w.user_id))]

    const { data: userProfiles } = await serviceClient
      .from("profiles")
      .select("id, timezone")
      .in("id", uniqueUserIds)

    const tzByUser = new Map(
      (userProfiles ?? []).map((p) => [p.id, p.timezone ?? "America/Chicago"]),
    )

    const windowsByUser = new Map<string, Set<number>>()
    for (const w of allWindows) {
      if (!windowsByUser.has(w.user_id)) windowsByUser.set(w.user_id, new Set())
      windowsByUser.get(w.user_id)!.add(w.hour_of_day)
    }

    const productiveUserIds = uniqueUserIds.filter((uid) => {
      const tz = tzByUser.get(uid) ?? "America/Chicago"
      const localHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "numeric",
          hourCycle: "h23",
        }).format(now),
        10,
      )
      return windowsByUser.get(uid)?.has(localHour) ?? false
    })

    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000)

    let productiveWindowSent = 0

    await Promise.allSettled(
      productiveUserIds.map(async (userId) => {
        const sub = subsByUser.get(userId)
        if (!sub) return

        // Dedup: skip if a productive_window nudge was already sent in the last 20 hours.
        const { data: recentLog } = await serviceClient
          .from("nudge_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("nudge_type", "productive_window")
          .gte("sent_at", twentyHoursAgo.toISOString())
          .maybeSingle()

        if (recentLog) return

        // Fetch up to 3 upcoming incomplete assignments (pass nearest to OpenAI).
        const { data: assignments } = await serviceClient
          .from("assignments")
          .select("id, title, due_at, courses(name)")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .gt("due_at", now.toISOString())
          .lt("due_at", fiveDaysFromNow.toISOString())
          .order("due_at", { ascending: true })
          .limit(3)

        if (!assignments || assignments.length === 0) return

        const nearest = assignments[0]
        if (!nearest.due_at) return

        const courseName =
          (nearest.courses as { name: string } | null)?.name ?? "Unknown Course"

        const nudgeText = await generateNudge(
          nearest.title,
          nearest.due_at,
          courseName,
        )

        const subscription: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }

        await sendPushNotification(subscription, nudgeText)
        productiveWindowSent++

        await serviceClient.from("nudge_logs").insert({
          user_id: userId,
          assignment_id: nearest.id,
          nudge_type: "productive_window",
          sent_at: now.toISOString(),
        })
      }),
    )

    // ── Section B: Deadline Nudges ────────────────────────────────────────────
    // Fire for ALL users with push subscriptions, regardless of productive hours.
    // Thresholds: 12h (±1h window), 6h (±1h window), 1h (±30m window).

    const thirteenHoursFromNow = new Date(now.getTime() + 13 * 3_600_000)
    let deadlineSent = 0

    await Promise.allSettled(
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

          await sendPushNotification(subscription, message, threshold.notifTitle)
          deadlineSent++

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

    return { productive_window_sent: productiveWindowSent, deadline_sent: deadlineSent }
  },
})
