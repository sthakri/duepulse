import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/lib/env"

export async function middleware(request: NextRequest) {
  // Build a mutable response we can attach refreshed session cookies to.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write updated cookies onto both the request (so downstream Server
          // Components see the refreshed session) and the response (so the
          // browser stores the new tokens).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Calling getUser() refreshes the session token if it is close to expiry.
  // This must run on every matched request — do not remove it.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect authenticated users away from the login page.
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static public files.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*|manifest\\.json|icons/).*)",
  ],
}
