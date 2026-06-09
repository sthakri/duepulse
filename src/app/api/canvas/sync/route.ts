import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCanvasAssignments } from "@/lib/canvas";
import { Database } from "@/database.types";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
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

  const token = profile.canvas_token;
  const domain = profile.canvas_domain;

  // ── 4. Fetch assignments from Canvas ─────────────────────────────────────
  let assignments: Awaited<ReturnType<typeof getCanvasAssignments>>;
  try {
    assignments = await getCanvasAssignments(token, domain);
  } catch (err) {
    console.error("Canvas API error:", err);
    return NextResponse.json(
      { success: false, error: "Canvas connection failed" },
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
      const uniqueCourseIds = [...new Set(assignments.map((a) => a.canvas_course_id))];

      await serviceClient
        .from("courses")
        .upsert(
          uniqueCourseIds.map((cid) => ({
            user_id: userId,
            canvas_course_id: cid,
            name: String(cid),
          })),
          { onConflict: "user_id,canvas_course_id", ignoreDuplicates: true }
        )
        .throwOnError();

      const { data: courses } = await serviceClient
        .from("courses")
        .select("id,canvas_course_id")
        .eq("user_id", userId)
        .in("canvas_course_id", uniqueCourseIds)
        .throwOnError();

      const courseMap = new Map(
        (courses ?? []).map((c) => [c.canvas_course_id, c.id])
      );

      const rows = assignments
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
