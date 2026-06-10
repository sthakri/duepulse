import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function proxy(request: NextRequest) {
  // Build a mutable response we can attach refreshed session cookies to.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies onto both the request (so downstream Server
          // Components see the refreshed session) and the response (so the
          // browser stores the new tokens).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Calling getUser() refreshes the session token if it is close to expiry.
  // This must run on every matched request — do not remove it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Unauthenticated users on protected routes → homepage.
  if (!user && (pathname.startsWith("/dashboard") || pathname === "/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user) {
    // 2. Authenticated user on /login → onboarded → dashboard, else → onboarding.
    if (pathname === "/login") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("canvas_token, onboarding_complete")
        .eq("id", user.id)
        .single();

      const url = request.nextUrl.clone();
      url.pathname =
        profile?.canvas_token && profile?.onboarding_complete
          ? "/dashboard"
          : "/onboarding";
      return NextResponse.redirect(url);
    }

    // 3. Authenticated user on / (homepage) → onboarded → dashboard, else → onboarding.
    if (pathname === "/") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("canvas_token, onboarding_complete")
        .eq("id", user.id)
        .single();

      const url = request.nextUrl.clone();
      url.pathname =
        profile?.canvas_token && profile?.onboarding_complete
          ? "/dashboard"
          : "/onboarding";
      return NextResponse.redirect(url);
    }

    // 4. Authenticated on /dashboard but onboarding incomplete → redirect to /onboarding.
    if (pathname.startsWith("/dashboard")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("canvas_token, onboarding_complete")
        .eq("id", user.id)
        .single();

      if (!profile?.canvas_token || !profile?.onboarding_complete) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }

    // 5. Authenticated on /onboarding but already done → redirect to /dashboard.
    if (pathname === "/onboarding") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, canvas_token")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_complete && profile?.canvas_token) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static public files.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*|manifest\\.json|icons/).*)",
  ],
};
