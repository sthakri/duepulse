import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCanvasAssignments, getCanvasCourses, CanvasCourse, CanvasAuthError } from "@/lib/canvas";
import { decryptOrRaw, encrypt, isLikelyEncrypted } from "@/lib/crypto";
import { Database } from "@/database.types";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(30, "1 h"),
});

export async function POST() {
  // ── 1. Authenticate via session cookie — never trust body.userId ──────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  // ── 2. Rate-limit by the verified user ID ─────────────────────────────────
  const { success: rateLimitOk } = await ratelimit.limit(userId);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many syncs. Try again later." },
      { status: 429 }
    );
  }

  // ── 3. Read Canvas credentials from DB — not from request body ────────────
  // Credentials were saved to the profile during onboarding. Reading them
  // server-side prevents any caller from writing to another user's account.
  const { data: profile } = await supabase
    .from("profiles")
    .select("canvas_token, canvas_domain")
    .eq("id", userId)
    .single();

  if (!profile?.canvas_token || !profile?.canvas_domain) {
    return NextResponse.json(
      { error: "Canvas not connected. Complete onboarding first." },
      { status: 400 }
    );
  }

  const token = await decryptOrRaw(profile.canvas_token);
  const domain = profile.canvas_domain;

  if (!isLikelyEncrypted(profile.canvas_token)) {
    encrypt(profile.canvas_token).then(async (ct) => {
      try {
        await supabase.from("profiles").update({ canvas_token: ct }).eq("id", userId);
        console.log(`Auto-encrypted canvas_token for ${userId}`);
      } catch {}
    });
  }

  // ── 4. Fetch courses (for names) and assignments from Canvas ──────────────
  let assignments: Awaited<ReturnType<typeof getCanvasAssignments>>;
  let courses: Awaited<ReturnType<typeof getCanvasCourses>>;
  try {
    [assignments, courses] = await Promise.all([
      getCanvasAssignments(token, domain),
      getCanvasCourses(token, domain),
    ]);
  } catch (err) {
    if (err instanceof CanvasAuthError) {
      return NextResponse.json(
        { success: false, tokenExpired: true, error: "Canvas token expired — generate a new one in Canvas → Account → Settings → New Access Token and reconnect." },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "Canvas connection failed";
    console.error("Canvas API error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }

  // ── 5. Write to DB using service role (bypasses RLS for upserts) ──────────
  const serviceClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    if (assignments.length > 0) {
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
    }

    await serviceClient
      .from("profiles")
      .update({ canvas_domain: domain, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .throwOnError();

    return NextResponse.json({ success: true, synced: assignments.length });
  } catch (err) {
    console.error("Supabase sync error:", err);
    return NextResponse.json(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }
}
