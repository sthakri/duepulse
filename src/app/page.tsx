import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Brain, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    icon: BookOpen,
    title: "Real Canvas Data",
    body: "Pulls your actual assignments, due dates, and course load straight from Canvas LMS — no manual entry.",
  },
  {
    icon: Brain,
    title: "Learns Your Brain",
    body: "Tracks when you actually sit down and focus, then builds a model of your productive windows over time.",
  },
  {
    icon: Bell,
    title: "Calm Nudges",
    body: "No spam. DuePulse nudges you exactly when you're likely to act — not just when a deadline is close.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 7-day auto sign-out
  if (user?.last_sign_in_at) {
    const lastSignIn = new Date(user.last_sign_in_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (lastSignIn < sevenDaysAgo) {
      await supabase.auth.signOut({ scope: "local" });
      redirect("/login");
    }
  }

  async function handleSignOut() {
    "use server";
    const s = await createClient();
    await s.auth.signOut({ scope: "local" });
    redirect("/login");
  }

  const initial = user?.email?.charAt(0).toUpperCase() ?? null;
  const memberSince = user
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(user.created_at))
    : null;

  return (
    <main className="flex flex-col flex-1 bg-slate-900">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            DuePulse
          </span>

          <div className="flex items-center gap-2">
            {user ? (
              /* Logged-in: avatar + dropdown */
              <details className="relative group">
                <summary className="list-none cursor-pointer select-none w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-sm hover:bg-indigo-500/30 transition-colors">
                  {initial}
                </summary>
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-white text-sm font-medium truncate">
                      {user.email}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Member since {memberSince}
                    </p>
                  </div>
                  <form action={handleSignOut}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/60 text-sm transition-colors bg-transparent"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              /* Logged-out: Sign In + Sign Up */
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800 text-sm h-9 px-4"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm h-9 px-4"
                >
                  <Link href="/login">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-4 text-center">
        <h1 className="text-white font-semibold text-4xl md:text-5xl max-w-2xl leading-tight">
          Your deadlines, your brain, finally in sync.
        </h1>
        <p className="text-slate-300 text-lg mt-4 max-w-xl">
          DuePulse connects to Canvas LMS, learns when you actually focus, and
          nudges you at exactly the right moment.
        </p>
        {user ? (
          <Button
            asChild
            className="bg-indigo-500 hover:bg-indigo-600 text-white mt-8 px-6 py-3 text-base h-auto w-full sm:w-auto"
          >
            <Link href="/dashboard">Go to Dashboard →</Link>
          </Button>
        ) : (
          <Button
            asChild
            className="bg-indigo-500 hover:bg-indigo-600 text-white mt-8 px-6 py-3 text-base h-auto w-full sm:w-auto"
          >
            <Link href="/onboarding">Connect Your Canvas →</Link>
          </Button>
        )}
      </section>

      {/* Feature cards */}
      <section className="bg-slate-900 py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl bg-slate-800 p-4">
              <Icon className="text-indigo-400 mb-3" size={24} />
              <h2 className="text-white font-semibold text-lg">{title}</h2>
              <p className="text-slate-300 text-base mt-1">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-900 py-8 text-center text-slate-400 text-sm">
        DuePulse — Built for students, by a student.
      </footer>
    </main>
  );
}
