import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCanvasAssignments,
  getCanvasCourses,
  CanvasCourse,
  CanvasAuthError,
} from "@/lib/canvas";
import { decryptOrRaw } from "@/lib/crypto";
import { Database } from "@/database.types";

export type CanvasSyncResult =
  | { ok: true; synced: number }
  | {
      ok: false;
      reason:
        | "not_connected"
        | "decrypt_failed"
        | "token_expired"
        | "canvas_error"
        | "db_error";
      message: string;
    };

/**
 * Sync one user's Canvas assignments into the DB.
 *
 * Shared by /api/canvas/sync (client-triggered) and the scheduled
 * canvas-sync Trigger.dev task, so assignments stay fresh — and nudges
 * keep firing — even when the user never opens the app.
 *
 * Requires a service-role client: it reads canvas_token and writes past RLS.
 */
export async function syncUserCanvas(
  serviceClient: SupabaseClient<Database>,
  userId: string,
): Promise<CanvasSyncResult> {
  // Read Canvas credentials from DB — never from request body.
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("canvas_token, canvas_domain")
    .eq("id", userId)
    .single();

  if (!profile?.canvas_token || !profile?.canvas_domain) {
    return {
      ok: false,
      reason: "not_connected",
      message: "Canvas not connected. Complete onboarding first.",
    };
  }

  const token = await decryptOrRaw(profile.canvas_token);
  const domain = profile.canvas_domain;

  if (!token) {
    return {
      ok: false,
      reason: "decrypt_failed",
      message:
        "Could not decrypt stored Canvas token. Please reconnect your Canvas account.",
    };
  }

  let assignments: Awaited<ReturnType<typeof getCanvasAssignments>>;
  let courses: Awaited<ReturnType<typeof getCanvasCourses>>;
  try {
    [assignments, courses] = await Promise.all([
      getCanvasAssignments(token, domain),
      getCanvasCourses(token, domain),
    ]);
  } catch (err) {
    if (err instanceof CanvasAuthError) {
      return {
        ok: false,
        reason: "token_expired",
        message:
          "Canvas token expired — generate a new one in Canvas → Account → Settings → New Access Token and reconnect.",
      };
    }
    const message =
      err instanceof Error ? err.message : "Canvas connection failed";
    console.error("Canvas API error:", message);
    return { ok: false, reason: "canvas_error", message };
  }

  try {
    if (assignments.length === 0) {
      return { ok: true, synced: 0 };
    }

    // Build course name map from Canvas API response
    const courseNameMap = new Map(
      courses.map((c: CanvasCourse) => [c.id, c.name])
    );

    const uniqueCourseIds = [...new Set(assignments.map((a) => a.canvas_course_id))];

    await serviceClient
      .from("courses")
      .upsert(
        uniqueCourseIds.map((cid) => ({
          user_id: userId,
          canvas_course_id: cid,
          name: courseNameMap.get(cid) ?? `Course ${cid}`,
        })),
        { onConflict: "user_id,canvas_course_id" }
      )
      .throwOnError();

    const { data: dbCourses } = await serviceClient
      .from("courses")
      .select("id,canvas_course_id")
      .eq("user_id", userId)
      .in("canvas_course_id", uniqueCourseIds)
      .throwOnError();

    const courseMap = new Map(
      (dbCourses ?? []).map((c) => [c.canvas_course_id, c.id])
    );

    // Fetch existing dismissed rows for the incoming assignment IDs so we can
    // (a) skip re-upserting dismissed-but-still-incomplete rows (keeps
    //     dismissed_at intact and avoids resetting updated_at every sync),
    // (b) hard-delete dismissed rows that Canvas now reports submitted —
    //     the user dismissed them and Canvas is source of truth, so no need
    //     to keep the row around.
    const incomingCanvasIds = assignments.map((a) => a.canvas_assignment_id);
    const { data: existingDismissed } = await serviceClient
      .from("assignments")
      .select("id, canvas_assignment_id, is_completed")
      .eq("user_id", userId)
      .in("canvas_assignment_id", incomingCanvasIds)
      .not("dismissed_at", "is", null)
      .throwOnError();

    const dismissedIdMap = new Map(
      (existingDismissed ?? []).map((r) => [r.canvas_assignment_id, r.id])
    );

    // Dismissed + Canvas now reports submitted → delete. The user dismissed
    // this assignment; no need to resurrect it as a completed row.
    const toDeleteIds: string[] = [];
    for (const a of assignments) {
      if (a.is_completed && dismissedIdMap.has(a.canvas_assignment_id)) {
        toDeleteIds.push(dismissedIdMap.get(a.canvas_assignment_id)!);
      }
    }

    if (toDeleteIds.length > 0) {
      await serviceClient
        .from("assignments")
        .delete()
        .in("id", toDeleteIds)
        .throwOnError();
    }

    // Build upsert payload, excluding every dismissed row (deleted or kept hidden).
    const rows = assignments
      .filter((a) => !dismissedIdMap.has(a.canvas_assignment_id))
      .map(({ canvas_course_id, ...a }) => ({
        ...a,
        user_id: userId,
        course_id: courseMap.get(canvas_course_id) ?? "",
      }))
      .filter((r) => r.course_id !== "");

    if (rows.length > 0) {
      await serviceClient
        .from("assignments")
        .upsert(rows, { onConflict: "user_id,canvas_assignment_id" })
        .throwOnError();
    }

    return { ok: true, synced: assignments.length };
  } catch (err) {
    console.error("Supabase sync error:", err);
    return { ok: false, reason: "db_error", message: "Database error" };
  }
}
