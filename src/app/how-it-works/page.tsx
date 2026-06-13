import Link from "next/link";
import { Zap, PlugZap, CalendarDays, Cpu, Bell } from "lucide-react";

export const metadata = {
  title: "How It Works — DuePulse",
  description:
    "Connect Canvas, let DuePulse learn your patterns, and receive exactly the right nudge at the right moment.",
};

const steps = [
  {
    number: "01",
    icon: PlugZap,
    title: "Connect your Canvas account",
    body: "Enter your Canvas domain and a personal access token — one-time setup that takes under two minutes. DuePulse immediately reads your courses, assignments, and due dates.",
    detail: "Canvas → Account → Settings → New Access Token. Your token is encrypted at rest and never shared.",
  },
  {
    number: "02",
    icon: CalendarDays,
    title: "DuePulse reads your deadlines",
    body: "Every assignment, every due date, every course color — pulled straight from Canvas. No copy-pasting. No manual calendar entries. Everything stays in sync.",
    detail: "Hit Sync Now to pull the latest at any time. Sync also runs automatically in the background via scheduled jobs.",
  },
  {
    number: "03",
    icon: Cpu,
    title: "Your focus patterns are learned",
    body: "Every time you open DuePulse — on any device, at any hour — your visit is quietly logged. Over days and weeks, a personal model forms.",
    detail: 'Your "Focus Persona" (Early Bird, Night Owl, Weekend Grinder…) and your personal Power Block emerge automatically.',
  },
  {
    number: "04",
    icon: Bell,
    title: "You get the right nudge at the right moment",
    body: "When an assignment is coming up AND you're historically likely to sit down and work, DuePulse sends a push notification — written by AI for that specific assignment.",
    detail: "Three modes: Aggressive, Normal, Minimal. Quiet Hours blocks late-night nudges.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-[#0F172A] min-h-screen flex flex-col text-[#F8FAFC]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#334155]/60 bg-[#08111F]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Zap size={15} className="text-[#818CF8]" fill="#818CF8" />
            </div>
            <span className="font-bold text-[#F8FAFC] tracking-tight">DuePulse</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">Features</Link>
            <Link href="/how-it-works" className="text-sm text-[#818CF8] font-medium">How it works</Link>
          </nav>
          <Link href="/login" className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white text-sm font-semibold px-4 py-2 transition-colors shadow-[0_8px_25px_rgba(99,102,241,0.3)]">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-3 py-1 text-xs font-medium text-[#818CF8] mb-6">
          <Zap size={11} fill="currentColor" /> 4 steps
        </span>
        <h1 className="text-[#F8FAFC] font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight mb-4">
          From Canvas to calm —{" "}
          <span className="text-[#6366F1]">here&apos;s how it works.</span>
        </h1>
        <p className="text-[#CBD5E1] text-lg leading-relaxed max-w-xl mx-auto">
          DuePulse is a system, not just an app. Each piece builds on the last, creating something that gets smarter the longer you use it.
        </p>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-5 pb-24 w-full">
        <div className="relative flex flex-col gap-0">
          <div className="absolute left-[27px] top-14 bottom-14 w-px bg-gradient-to-b from-[#6366F1]/40 via-[#6366F1]/15 to-transparent hidden sm:block" />
          {steps.map(({ number, icon: Icon, title, body, detail }, i) => (
            <div key={number} className="flex gap-6 sm:gap-8 pb-10 last:pb-0">
              <div className="flex flex-col items-center gap-0 shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-[#1E293B] border border-[#6366F1]/30 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(99,102,241,0.12)]">
                  <Icon size={22} className="text-[#818CF8]" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-2 pb-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[#6366F1]/60 font-bold text-sm font-mono">{number}</span>
                  <h2 className="text-[#F8FAFC] font-bold text-xl leading-tight">{title}</h2>
                </div>
                <p className="text-[#CBD5E1] text-base leading-relaxed mb-3">{body}</p>
                <div className="rounded-xl bg-[#1E293B] border border-[#334155]/70 px-4 py-3">
                  <p className="text-[#94A3B8] text-sm leading-relaxed">{detail}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex items-center gap-2 mt-6 mb-2 sm:hidden">
                    <div className="flex-1 h-px bg-[#334155]" />
                    <span className="text-[#334155] text-xs">↓</span>
                    <div className="flex-1 h-px bg-[#334155]" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 pb-20 w-full">
        <div className="rounded-[18px] border border-[#334155]/70 bg-[#1E293B] divide-y divide-[#334155]/50">
          {[
            { q: "Is my Canvas token safe?", a: "Yes. Your token is stored encrypted in our database (Supabase with row-level security) and is never exposed in responses or logs." },
            { q: "Do notifications work on iPhone?", a: "Yes, but only when DuePulse is installed as a standalone app (Add to Home Screen). Safari browser tabs can't receive background push notifications — it's an iOS limitation." },
            { q: "How long until DuePulse learns my patterns?", a: "You'll see basic stats immediately. A meaningful focus model forms after 3–7 days of regular visits." },
          ].map(({ q, a }) => (
            <div key={q} className="px-6 py-5">
              <p className="text-[#F8FAFC] font-semibold text-sm mb-1.5">{q}</p>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-5 pb-24 text-center">
        <div className="rounded-[20px] border border-[#6366F1]/25 bg-[#6366F1]/8 p-10">
          <h2 className="text-[#F8FAFC] font-bold text-2xl mb-3">See it for yourself</h2>
          <p className="text-[#CBD5E1] text-base mb-6">It takes two minutes to connect Canvas and the rest happens on its own.</p>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold px-7 py-3 text-base transition-colors shadow-[0_12px_35px_rgba(99,102,241,0.35)]">
            Get Started — it&apos;s free
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#334155]/40 mt-auto py-6 text-center">
        <p className="text-[#64748B] text-xs">DuePulse — Built for students, by a student.</p>
      </footer>
    </div>
  );
}
