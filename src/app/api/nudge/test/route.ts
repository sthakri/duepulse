import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import { generateNudge } from "@/lib/nim"
import { sendPushNotification } from "@/lib/webpush"
import { getDefaultTimezone } from "@/lib/time"
import { nudgeTestQuerySchema } from "@/lib/validations"
import type { Database } from "@/database.types"
import webpush from "web-push"

type NudgeType = "productive_window" | "12h" | "6h" | "1h"

const DEADLINE_THRESHOLDS: Record<
  Exclude<NudgeType, "productive_window">,
  { label: string; notifTitle: string; minMs: number; maxMs: number }
> = {
  "12h": {
    label: "~12 hours",
    notifTitle: "Due in ~12 Hours ⏰",
    minMs: 11 * 3_600_000,
    maxMs: 13 * 3_600_000,
  },
  "6h": {
    label: "~6 hours",
    notifTitle: "Due in ~6 Hours ⚡",
    minMs: 5 * 3_600_000,
    maxMs: 7 * 3_600_000,
  },
  "1h": {
    label: "1 hour",
    notifTitle: "Due in 1 Hour 🚨",
    minMs: 30 * 60_000,
    maxMs: 90 * 60_000,
  },
}

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

export async function GET(req: NextRequest) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({}, { status: 404 })
  }

  const parsed = nudgeTestQuerySchema.safeParse({
    userId: req.nextUrl.searchParams.get("userId"),
    type: req.nextUrl.searchParams.get("type") ?? "productive_window",
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 422 })
  }
  const { userId, type } = parsed.data

  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: subs } = await serviceClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "No push subscription found" }, { status: 400 })
  }

  const now = new Date()

  // ── Overdue nudge ────────────────────────────────────────────────────────────
  if (type === "overdue") {
    const { data: assignment } = await serviceClient
      .from("assignments")
      .select("id, title, due_at, courses(name)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .lt("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: "No overdue assignment found" }, { status: 400 })
    }

    const courseName =
      (assignment.courses as { name: string } | null)?.name ?? "Unknown Course"

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle()
    const userTz = profile?.timezone ?? getDefaultTimezone()

    const nudgeText = await generateNudge(
      assignment.title,
      assignment.due_at ?? now.toISOString(),
      courseName,
      userTz,
    )

    const results: string[] = []
    for (const sub of subs) {
      const subscription: webpush.PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      try {
        await sendPushNotification(subscription, nudgeText, "Overdue Assignment 📌")
        results.push(`✓ ${sub.endpoint.slice(0, 50)}…`)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
          results.push(`✗ stale (${statusCode}), deleted`)
        } else {
          results.push(`✗ error: ${String(err)}`)
        }
      }
    }

    await serviceClient.from("nudge_logs").insert({
      user_id: userId,
      assignment_id: assignment.id,
      nudge_type: "overdue",
      sent_at: now.toISOString(),
    })

    return NextResponse.json({ sent: true, type, assignment: assignment.title, nudge: nudgeText, devices: results })
  }

  // ── Productive window nudge ──────────────────────────────────────────────────
  if (type === "productive_window") {
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

    const { data: assignment } = await serviceClient
      .from("assignments")
      .select("id, title, due_at, courses(name)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .gt("due_at", now.toISOString())
      .lt("due_at", fiveDaysFromNow.toISOString())
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!assignment || !assignment.due_at) {
      return NextResponse.json({ error: "No upcoming assignment found" }, { status: 400 })
    }

    const courseName =
      (assignment.courses as { name: string } | null)?.name ?? "Unknown Course"

    // Fetch user's timezone for accurate local time in the nudge text.
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle()
    const userTz = profile?.timezone ?? getDefaultTimezone()

    const nudgeText = await generateNudge(
      assignment.title,
      assignment.due_at,
      courseName,
      userTz,
    )

    // Send to ALL devices for this user.
    const results: string[] = []
    for (const sub of subs) {
      const subscription: webpush.PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      try {
        await sendPushNotification(subscription, nudgeText)
        results.push(`✓ ${sub.endpoint.slice(0, 50)}…`)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
          results.push(`✗ stale (${statusCode}), deleted`)
        } else {
          results.push(`✗ error: ${String(err)}`)
        }
      }
    }

    await serviceClient.from("nudge_logs").insert({
      user_id: userId,
      assignment_id: assignment.id,
      nudge_type: "productive_window",
      sent_at: now.toISOString(),
    })

    return NextResponse.json({ sent: true, type, assignment: assignment.title, nudge: nudgeText, devices: results })
  }

  // ── Deadline nudge (12h / 6h / 1h) ──────────────────────────────────────────
  const threshold = DEADLINE_THRESHOLDS[type]

  const { data: upcomingAssignments } = await serviceClient
    .from("assignments")
    .select("id, title, due_at")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .gt("due_at", now.toISOString())
    .lte("due_at", new Date(now.getTime() + threshold.maxMs).toISOString())
    .order("due_at", { ascending: true })

  if (!upcomingAssignments || upcomingAssignments.length === 0) {
    return NextResponse.json({
      sent: false,
      type,
      reason: `No assignments due within the ${type} window`,
    })
  }

  // Filter to assignments actually inside the minimum boundary.
  const inWindow = upcomingAssignments.filter((a) => {
    if (!a.due_at) return false
    const ms = new Date(a.due_at).getTime() - now.getTime()
    return ms >= threshold.minMs
  })

  if (inWindow.length === 0) {
    return NextResponse.json({ sent: false, type, reason: "No assignments in window" })
  }

  // Check which have already been sent (dedup).
  const assignmentIds = inWindow.map((a) => a.id)
  const { data: sentLogs } = await serviceClient
    .from("nudge_logs")
    .select("assignment_id")
    .eq("user_id", userId)
    .in("assignment_id", assignmentIds)
    .eq("nudge_type", type)

  const sentIds = new Set((sentLogs ?? []).map((l) => l.assignment_id))
  const toSend = inWindow.filter((a) => !sentIds.has(a.id))

  if (toSend.length === 0) {
    return NextResponse.json({
      sent: false,
      type,
      reason: "Already sent for all assignments in this window",
    })
  }

  const message = buildDeadlineMessage(toSend, threshold.label)

  // Send to ALL devices for this user.
  const results: string[] = []
  for (const sub of subs) {
    const subscription: webpush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }
    try {
      await sendPushNotification(subscription, message, threshold.notifTitle)
      results.push(`✓ ${sub.endpoint.slice(0, 50)}…`)
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 410 || statusCode === 404) {
        await serviceClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        results.push(`✗ stale (${statusCode}), deleted`)
      } else {
        results.push(`✗ error: ${String(err)}`)
      }
    }
  }

  await serviceClient.from("nudge_logs").insert(
    toSend.map((a) => ({
      user_id: userId,
      assignment_id: a.id,
      nudge_type: type,
      sent_at: now.toISOString(),
    })),
  )

  return NextResponse.json({
    sent: true,
    type,
    assignments: toSend.map((a) => a.title),
    message,
    devices: results,
  })
}

