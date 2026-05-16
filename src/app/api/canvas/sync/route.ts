import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";
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

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).userId !== "string" ||
    typeof (body as Record<string, unknown>).token !== "string" ||
    typeof (body as Record<string, unknown>).domain !== "string" ||
    !(body as Record<string, unknown>).userId ||
    !(body as Record<string, unknown>).token ||
    !(body as Record<string, unknown>).domain
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { userId, token, domain } = body as {
    userId: string;
    token: string;
    domain: string;
  };

  const { success: rateLimitOk } = await ratelimit.limit(userId);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many syncs. Try again later." },
      { status: 429 }
    );
  }

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
