import { schedules } from "@trigger.dev/sdk/v3"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import { generateNudge, generateProductiveWindowNudge } from "@/lib/nim"
import { sendPushNotification } from "@/lib/webpush"
import { getLocalHour, getLocalDay, getDefaultTimezone } from "@/lib/time"
import type { Database } from "@/database.types"
import webpush from "web-push"
import ws from "ws"

// ── Deadline threshold definitions ────────────────────────────────────────────
type DeadlineType = "12h" | "6h" | "1h"

import { filterDailyOverdueNudge, filterNeverNudgedOverdue } from "@/lib/overdue-dedup";
export { filterDailyOverdueNudge, filterNeverNudgedOverdue };

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


function isInQuietHours(
  start: number | null,
  end: number | null,
  localHour: number,
): boolean {
  if (start === null || end === null) return false
  if (start === end) return localHour === start
  if (start < end) return localHour >= start && localHour < end
  return localHour >= start || localHour < end
}

// ─────────────────────────────────────────────────────────────────────────────

export const nudgeEngine = schedules.task({
  id: "send-nudges",
  cron: "0 * * * *",
  run: async () => {
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
    const subsByUser = new Map<string, typeof allSubs>()
    for (const s of allSubs) {
      const existing = subsByUser.get(s.user_id) ?? []
      existing.push(s)
      subsByUser.set(s.user_id, existing)
    }

    console.log(`[nudge-engine] productive_windows rows: ${allWindows.length}, push_subscriptions rows: ${allSubs.length}`)
    if (windowsResult.error) console.error("[nudge-engine] productive_windows query error:", windowsResult.error)
    if (subsResult.error) console.error("[nudge-engine] push_subscriptions query error:", subsResult.error)

    // ── Section A: Productive Window Nudges ───────────────────────────────────
    // Fire only during the user's local productive day+hour, at most once per 20h.

    const uniqueUserIds = [...new Set(allWindows.map((w) => w.user_id))]
    const allSubUserIds = allSubs.map((s) => s.user_id)
    const profileUserIds = [...new Set([...uniqueUserIds, ...allSubUserIds])]

    const { data: userProfiles } = await serviceClient
      .from("profiles")
      .select("id, timezone, quiet_hours_start, quiet_hours_end, nudge_frequency, nudge_paused_until")
      .in("id", profileUserIds)

    const profileByUser = new Map(
      (userProfiles ?? []).map((p) => [p.id, p]),
    )
    const tzByUser = new Map(
      (userProfiles ?? []).map((p) => [p.id, p.timezone ?? getDefaultTimezone()]),
    )

    // Key: "${day_of_week}:${hour_of_day}" — must match both day AND hour, not just hour.
    const windowsByUser = new Map<string, Set<string>>()
    for (const w of allWindows) {
      if (!windowsByUser.has(w.user_id)) windowsByUser.set(w.user_id, new Set())
      windowsByUser.get(w.user_id)!.add(`${w.day_of_week}:${w.hour_of_day}`)
    }

    const productiveUserIds = uniqueUserIds.filter((uid) => {
      const tz = tzByUser.get(uid) ?? getDefaultTimezone()
      const localHour = getLocalHour(now, tz)
      const localDay = getLocalDay(now, tz)
      const key = `${localDay}:${localHour}`
      const matches = windowsByUser.get(uid)?.has(key) ?? false
      console.log(`[nudge-engine] Section A uid=${uid} tz=${tz} day=${localDay} hour=${localHour} key=${key} matches=${matches}`)
      return matches
    })

    // Extended to 14 days so assignments due next week are always found.
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    console.log(`[nudge-engine] Section A: ${productiveUserIds.length} user(s) in productive window`)
    let productiveWindowSent = 0

    const sectionAResults = await Promise.allSettled(
      productiveUserIds.map(async (userId) => {
        const subs = subsByUser.get(userId) ?? []
        if (subs.length === 0) {
          console.log(`[nudge-engine] Section A uid=${userId} no push subscription — skipping`)
          return
        }

        const pf = profileByUser.get(userId)
        if (!pf) {
          console.log(`[nudge-engine] Section A uid=${userId} no profile — skipping`)
          return
        }

        // Quiet hours check
        const localHour = getLocalHour(now, tzByUser.get(userId) ?? getDefaultTimezone())

        if (isInQuietHours(pf.quiet_hours_start, pf.quiet_hours_end, localHour)) {
          console.log(`[nudge-engine] Section A uid=${userId} in quiet hours — skipping`)
          return
        }

        // Nudge pause check
        if (pf.nudge_paused_until && new Date(pf.nudge_paused_until) > now) {
          console.log(`[nudge-engine] Section A uid=${userId} nudges paused until ${pf.nudge_paused_until} — skipping`)
          return
        }

        // Frequency check - minimal skips productive window nudges entirely
        if (pf.nudge_frequency === "minimal") {
          console.log(`[nudge-engine] Section A uid=${userId} frequency=minimal — skipping`)
          return
        }

        // Dedup window: 4h for aggressive, 20h for normal
        const dedupWindowMs = pf.nudge_frequency === "aggressive" ? 4 * 60 * 60 * 1000 : 20 * 60 * 60 * 1000
        const dedupSince = new Date(now.getTime() - dedupWindowMs)

        const { data: recentLog } = await serviceClient
          .from("nudge_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("nudge_type", "productive_window")
          .gte("sent_at", dedupSince.toISOString())
          .maybeSingle()

        if (recentLog) {
          console.log(`[nudge-engine] Section A uid=${userId} dedup hit — nudge already sent in last 20h`)
          return
        }

        // Fetch up to 5 upcoming incomplete assignments due within 14 days for workload context.
        const { data: assignments, error: assignmentsError } = await serviceClient
          .from("assignments")
          .select("id, title, due_at, courses(name)")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .is("dismissed_at", null)
          .gt("due_at", now.toISOString())
          .lt("due_at", fourteenDaysFromNow.toISOString())
          .order("due_at", { ascending: true })
          .limit(5)

        if (assignmentsError) {
          console.error(`[nudge-engine] Section A uid=${userId} assignments query error:`, assignmentsError)
          return
        }
        console.log(`[nudge-engine] Section A uid=${userId} upcoming assignments (14d window): ${assignments?.length ?? 0}`)
        if (!assignments || assignments.length === 0) return

        const userTz = tzByUser.get(userId) ?? getDefaultTimezone()
        const upcomingList = assignments.map((a) => ({
          title: a.title,
          courseName: (a.courses as { name: string } | null)?.name,
          dueAt: a.due_at,
        }))

        console.log(`[nudge-engine] Section A uid=${userId} calling generateProductiveWindowNudge (${upcomingList.length} tasks)`)
        const nudgeText = await generateProductiveWindowNudge({
          upcomingAssignments: upcomingList,
          totalPendingCount: assignments.length,
          userTz,
        })
        console.log(`[nudge-engine] Section A uid=${userId} nudge text: "${nudgeText}"`)

        // Send to ALL devices for this user.
        for (const sub of subs) {
          const subscription: webpush.PushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }
          try {
            await sendPushNotification(subscription, nudgeText, "Peak Focus Window ⚡")
            console.log(`[nudge-engine] Section A uid=${userId} push sent to ${sub.endpoint.slice(0, 50)}… ✓`)
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number })?.statusCode
            if (statusCode === 410 || statusCode === 404) {
              // Subscription expired — clean up
              console.log(`[nudge-engine] Section A uid=${userId} stale sub (${statusCode}), deleting`)
              await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
            } else {
              console.error(`[nudge-engine] Section A uid=${userId} push failed:`, err)
            }
          }
        }
        productiveWindowSent++

        const nearest = assignments[0]
        await serviceClient.from("nudge_logs").insert({
          user_id: userId,
          assignment_id: nearest?.id ?? null,
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

        const pf = profileByUser.get(userId)

        // Quiet hours check (skip if profile is missing)
        if (pf) {
          const localHour = getLocalHour(now, tzByUser.get(userId) ?? getDefaultTimezone())

          if (isInQuietHours(pf.quiet_hours_start, pf.quiet_hours_end, localHour)) {
            console.log(`[nudge-engine] Section B uid=${userId} in quiet hours — skipping`)
            return
          }

          if (pf.nudge_paused_until && new Date(pf.nudge_paused_until) > now) {
            console.log(`[nudge-engine] Section B uid=${userId} nudges paused until ${pf.nudge_paused_until} — skipping`)
            return
          }
        } else {
          console.log(`[nudge-engine] Section B uid=${userId} no profile — allowing nudges (default behavior)`)
        }

        // Fetch all incomplete assignments due within the widest threshold window.
        const { data: upcomingAssignments } = await serviceClient
          .from("assignments")
          .select("id, title, due_at")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .is("dismissed_at", null)
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
          // In minimal mode, only send 1h deadline nudges.
          if (pf?.nudge_frequency === "minimal" && threshold.type !== "1h") continue

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
          try {
            await sendPushNotification(subscription, message, threshold.notifTitle)
            deadlineSent++
            console.log(`[nudge-engine] Section B uid=${userId} ${threshold.type} push sent successfully ✓`)
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number })?.statusCode
            if (statusCode === 410 || statusCode === 404) {
              console.log(`[nudge-engine] Section B uid=${userId} stale sub (${statusCode}), deleting`)
              await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
              return // Skip remaining thresholds for this dead subscription
            }
            console.error(`[nudge-engine] Section B uid=${userId} push failed:`, err)
          }

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

    // ── Section C: Cleanup completed assignments ──────────────────────────────
    // Hard-delete assignments marked completed more than 3 days ago.
    // nudge_logs cascade-deletes via FK, so no orphan cleanup needed.
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    let cleanedUp = 0
    try {
      const { count } = await serviceClient
        .from("assignments")
        .delete({ count: "exact" })
        .eq("is_completed", true)
        .lt("updated_at", threeDaysAgo.toISOString())
      cleanedUp = count ?? 0
      console.log(`[nudge-engine] Section C: deleted ${cleanedUp} completed assignment(s) older than 3 days`)
    } catch (err) {
      console.error("[nudge-engine] Section C cleanup error:", err)
    }

    // ── Section D: Overdue reminders ──────────────────────────────────────────
    // For each user with push subs, find incomplete past-due assignments and
    // nudge AT MOST ONCE A DAY (every 24 hours) per assignment until completed.
    // Fires even in minimal mode (overdue is existential). Quiet hours and pause still honored.
    let overdueSent = 0
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    console.log(`[nudge-engine] Section D: processing ${allSubs.length} push subscription(s) for overdue`)
    const sectionDResults = await Promise.allSettled(
      allSubs.map(async (sub) => {
        const userId = sub.user_id
        const pf = profileByUser.get(userId)

        if (pf) {
          const localHour = getLocalHour(now, tzByUser.get(userId) ?? getDefaultTimezone())
          if (isInQuietHours(pf.quiet_hours_start, pf.quiet_hours_end, localHour)) {
            console.log(`[nudge-engine] Section D uid=${userId} in quiet hours — skipping`)
            return
          }
          if (pf.nudge_paused_until && new Date(pf.nudge_paused_until) > now) {
            console.log(`[nudge-engine] Section D uid=${userId} nudges paused — skipping`)
            return
          }
        }

        // Past-due, incomplete, non-dismissed assignments for this user.
        const { data: overdueAssignments, error: overdueError } = await serviceClient
          .from("assignments")
          .select("id, title, due_at, courses(name)")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .is("dismissed_at", null)
          .lt("due_at", now.toISOString())
          .order("due_at", { ascending: true })
          .limit(5)

        if (overdueError) {
          console.error(`[nudge-engine] Section D uid=${userId} overdue query error:`, overdueError)
          return
        }
        if (!overdueAssignments || overdueAssignments.length === 0) return

        // 24-hour daily dedup: skip any assignment nudged within the last 24 hours.
        const assignmentIds = overdueAssignments.map((a) => a.id)
        const { data: existingOverdueLogs } = await serviceClient
          .from("nudge_logs")
          .select("assignment_id, sent_at")
          .eq("user_id", userId)
          .eq("nudge_type", "overdue")
          .in("assignment_id", assignmentIds)
          .gte("sent_at", twentyFourHoursAgo.toISOString())

        const toNudge = filterDailyOverdueNudge(overdueAssignments, existingOverdueLogs ?? [], now)
        if (toNudge.length === 0) {
          console.log(`[nudge-engine] Section D uid=${userId} all overdue already nudged within last 24h — skipping`)
          return
        }

        const subscription: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }

        for (const a of toNudge) {
          const courseName =
            (a.courses as { name: string } | null)?.name ?? "Unknown Course"
          const nudgeText = await generateNudge(
            a.title,
            a.due_at ?? now.toISOString(),
            courseName,
            tzByUser.get(userId) ?? getDefaultTimezone(),
          )
          console.log(`[nudge-engine] Section D uid=${userId} overdue nudge for "${a.title}"`)

          try {
            await sendPushNotification(subscription, nudgeText, "Overdue Assignment 📌")
            overdueSent++
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number })?.statusCode
            if (statusCode === 410 || statusCode === 404) {
              console.log(`[nudge-engine] Section D uid=${userId} stale sub (${statusCode}), deleting`)
              await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
              return
            }
            console.error(`[nudge-engine] Section D uid=${userId} push failed:`, err)
            continue
          }

          await serviceClient.from("nudge_logs")
            .upsert(
              { user_id: userId, assignment_id: a.id, nudge_type: "overdue", sent_at: now.toISOString() },
              { onConflict: "user_id,assignment_id,nudge_type" }
            )
        }
      }),
    )

    for (let i = 0; i < sectionDResults.length; i++) {
      const r = sectionDResults[i]
      if (r.status === "rejected") {
        console.error(`[nudge-engine] Section D uid=${allSubs[i].user_id} threw:`, r.reason)
      }
    }
    console.log(`[nudge-engine] Section D done: overdue_sent=${overdueSent}`)

    return {
      productive_window_sent: productiveWindowSent,
      deadline_sent: deadlineSent,
      cleaned_up: cleanedUp,
      overdue_sent: overdueSent,
    }
  },
})
