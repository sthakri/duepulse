import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { dismissAssignmentSchema } from "@/lib/validations";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success: rateLimitOk } = await ratelimit.limit(user.id);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const raw: unknown = await req.json();
  const parsed = dismissAssignmentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 422 }
    );
  }

  const { assignmentId } = parsed.data;

  // RLS enforces user_id match — only the owner's row updates.
  const { error } = await supabase
    .from("assignments")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .is("dismissed_at", null);

  if (error) {
    return NextResponse.json({ error: "Failed to dismiss assignment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
