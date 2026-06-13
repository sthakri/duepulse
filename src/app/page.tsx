import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Brain, Bell, Zap } from "lucide-react";
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

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, canvas_token")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_complete && profile?.canvas_token) {
      redirect("/dashboard");
    }
    redirect("/onboarding");
  }

  return (
    <main className="flex flex-col flex-1 min-h-screen bg-[radial-gradient(circle_at_top,#111C33_0%,#0F172A_45%,#08111F_100%)] text-[#F8FAFC]">
      {/* ── Sticky nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#334155]/60 bg-[#08111F]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 py-3 sm:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Zap size={15} className="text-[#818CF8]" fill="#818CF8" />
            </div>
            <span className="font-bold text-lg text-[#F8FAFC] tracking-tight">
              DuePulse
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/features"
              className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors"
            >
              How it works
            </Link>
          </nav>

          {/* CTA */}
          <Button
            asChild
            className="bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold text-sm h-9 px-4 rounded-xl shadow-[0_8px_25px_rgba(99,102,241,0.35)] transition-all duration-200"
          >
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-5 pt-20 pb-16 text-center max-w-3xl mx-auto">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-4 py-1.5 text-sm font-medium text-[#CBD5E1]">
          <Zap size={13} className="text-[#818CF8]" />
          For students, by a student
        </div>

        <h1 className="text-[#F8FAFC] font-extrabold text-5xl md:text-6xl leading-[1.05] tracking-tight max-w-2xl mb-5">
          Your deadlines, your brain,{" "}
          <span className="text-[#6366F1]">finally in sync.</span>
        </h1>

        <p className="text-[#CBD5E1] text-lg max-w-xl leading-relaxed mb-10">
          DuePulse connects to Canvas LMS, learns when you actually focus, and
          nudges you at exactly the right moment.
        </p>

        <Button
          asChild
          className="bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold px-7 py-3 text-base h-auto rounded-xl shadow-[0_12px_35px_rgba(99,102,241,0.35)] transition-all duration-200 hover:scale-[1.02]"
        >
          <Link href="/login">Connect Your Canvas →</Link>
        </Button>
      </section>

      {/* ── Feature cards ───────────────────────────────────────────────────── */}
      <section id="features" className="py-16 px-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[18px] bg-[#1E293B]/80 border border-[#334155]/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:border-[#6366F1]/40 hover:bg-[#243044]/80 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mb-4">
                <Icon className="text-[#818CF8]" size={18} />
              </div>
              <h2 className="text-[#F8FAFC] font-semibold text-base mb-2">
                {title}
              </h2>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center border-t border-[#334155]/40 mt-auto">
        <p className="text-[#94A3B8] text-sm">
          <Link href="/" className="text-[#6366F1] hover:text-[#818CF8] transition-colors">
            DuePulse
          </Link>{" "}
          — Built for students, by a student.
        </p>
      </footer>
    </main>
  );
}
