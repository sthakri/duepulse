import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback handler for Supabase email confirmation and OAuth flows.
 * Without this route, clicking an email confirmation link silently fails
 * in production — Supabase redirects to /auth/callback?code=... and expects
 * a server-side code exchange before the session cookie is set.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  // Allow a custom `next` param for post-auth redirects; default to onboarding.
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    // After the code exchange the middleware will run on the redirect and
    // forward the user to /dashboard if already onboarded, or keep them
    // at /onboarding if not.
  }

  return NextResponse.redirect(new URL(next, req.url));
}
