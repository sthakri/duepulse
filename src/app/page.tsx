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

  // Authenticated users never see the landing page — redirect immediately.
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

  // Only unauthenticated users reach the JSX below.
  return (
    <main className="flex flex-col flex-1 bg-[#0C111B]">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 bg-[#0C111B]/90 backdrop-blur-sm border-b border-[#2A3444]/60">
        <div className="max-w-6xl mx-auto px-5 py-3 sm:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center">
              <Zap size={14} className="text-[#D6B36A]" fill="#D6B36A" />
            </div>
            <span className="font-bold text-lg text-[#F6F1E8] tracking-tight">
              DuePulse
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-[#AAB4C4] hover:text-[#F6F1E8] text-sm transition-colors">
              Features
            </Link>
            <Link href="/how-it-works" className="text-[#AAB4C4] hover:text-[#F6F1E8] text-sm transition-colors">
              How it works
            </Link>
          </nav>

          {/* CTA */}
          <Button
            asChild
            className="bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold text-sm h-9 px-4 rounded-xl shadow-none"
          >
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-5 pt-20 pb-16 text-center max-w-3xl mx-auto">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2A3444] bg-[#151C2B] px-4 py-1.5 mb-8">
          <span className="text-[#D6B36A] text-xs">⚡</span>
          <span className="text-[#AAB4C4] text-xs font-medium">For students, by a student</span>
        </div>

        <h1 className="text-[#F6F1E8] font-bold text-5xl md:text-6xl leading-[1.1] tracking-tight max-w-2xl mb-6">
          Your deadlines, your brain,{" "}
          <span className="text-[#D6B36A]">finally in sync.</span>
        </h1>

        <p className="text-[#AAB4C4] text-lg max-w-xl leading-relaxed mb-10">
          DuePulse connects to Canvas LMS, learns when you actually focus, and
          nudges you at exactly the right moment.
        </p>

        <Button
          asChild
          className="bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold px-7 py-3 text-base h-auto rounded-xl shadow-none transition-all duration-200 hover:scale-[1.02]"
        >
          <Link href="/login">Connect Your Canvas →</Link>
        </Button>
      </section>

      {/* Feature cards */}
      <section id="features" className="py-16 px-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:border-[#D6B36A]/30 transition-colors duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-[#D6B36A]/10 border border-[#D6B36A]/20 flex items-center justify-center mb-4">
                <Icon className="text-[#D6B36A]" size={18} />
              </div>
              <h2 className="text-[#F6F1E8] font-semibold text-base mb-2">{title}</h2>
              <p className="text-[#AAB4C4] text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-[#7E8AA0] text-sm border-t border-[#2A3444]/40">
        DuePulse — Built for students, by a student.
      </footer>
    </main>
  );
}
