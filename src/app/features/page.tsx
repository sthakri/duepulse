import Link from "next/link";
import { Zap, BookOpen, Brain, Bell, Check, X } from "lucide-react";

export const metadata = {
  title: "Features — DuePulse",
  description:
    "Real Canvas data, a focus-learning engine, and calm AI nudges — everything DuePulse does to keep you ahead of your deadlines.",
};

const features = [
  {
    id: "canvas",
    icon: BookOpen,
    tag: "Real Canvas Data",
    headline: "No copy-pasting. No manual entry.",
    body: "DuePulse reads your actual course assignments straight from Canvas LMS — due dates, point values, submission types, and course colors — and keeps them up to date automatically.",
    points: [
      "Pulls every assignment from every active course",
      "Respects your existing course structure and colors",
      "Syncs in the background whenever you click Sync Now",
    ],
  },
  {
    id: "brain",
    icon: Brain,
    tag: "Focus Engine",
    headline: "Your schedule is yours — not a template.",
    body: "DuePulse quietly observes which hours and days you actually open the app. Over time it builds a personal model of your productive windows and discovers your Power Block — your peak focus period.",
    points: [
      "Tracks activity by hour and day of week",
      "Builds a focus persona: Night Owl, Early Bird, or Weekend Grinder",
      "Improves the more you use it — accuracy compounds",
    ],
  },
  {
    id: "nudges",
    icon: Bell,
    tag: "Calm Nudges",
    headline: "The right reminder, at the right moment.",
    body: "AI-generated push notifications arrive only during your documented productive windows — never at 3 AM, never spam. Each message is written for the specific assignment and your actual context.",
    points: [
      "Powered by NVIDIA NIM — fast, private AI inference",
      "Three frequency modes: Aggressive, Normal, Minimal",
      "Quiet Hours setting to block notifications at night",
    ],
  },
];

const comparison = [
  { label: "Sees your actual assignments", duepulse: true, reminders: false, calendar: false },
  { label: "Learns when you focus", duepulse: true, reminders: false, calendar: false },
  { label: "Nudges at the right moment", duepulse: true, reminders: false, calendar: false },
  { label: "No manual entry", duepulse: true, reminders: false, calendar: false },
  { label: "Works in the background", duepulse: true, reminders: true, calendar: false },
  { label: "Free to use", duepulse: true, reminders: true, calendar: true },
];

function NavBar({ active }: { active: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#334155]/60 bg-[#08111F]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Zap size={15} className="text-[#818CF8]" fill="#818CF8" />
          </div>
          <span className="font-bold text-[#F8FAFC] tracking-tight">DuePulse</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/features" className={`text-sm transition-colors ${active === "features" ? "text-[#818CF8] font-medium" : "text-[#94A3B8] hover:text-[#F8FAFC]"}`}>
            Features
          </Link>
          <Link href="/how-it-works" className={`text-sm transition-colors ${active === "how-it-works" ? "text-[#818CF8] font-medium" : "text-[#94A3B8] hover:text-[#F8FAFC]"}`}>
            How it works
          </Link>
        </nav>
        <Link href="/login" className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white text-sm font-semibold px-4 py-2 transition-colors shadow-[0_8px_25px_rgba(99,102,241,0.3)]">
          Get Started
        </Link>
      </div>
    </header>
  );
}

export default function FeaturesPage() {
  return (
    <div className="bg-[#0F172A] min-h-screen flex flex-col text-[#F8FAFC]">
      <NavBar active="features" />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-3 py-1 text-xs font-medium text-[#818CF8] mb-6">
          <Zap size={11} fill="currentColor" />
          What DuePulse does
        </span>
        <h1 className="text-[#F8FAFC] font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight mb-4">
          Built for how students{" "}
          <span className="text-[#6366F1]">actually work.</span>
        </h1>
        <p className="text-[#CBD5E1] text-lg leading-relaxed max-w-xl mx-auto">
          Not based on productivity gurus or generic reminder apps. DuePulse learns your actual patterns and works around them.
        </p>
      </section>

      {/* Feature sections */}
      <section className="max-w-5xl mx-auto px-5 pb-20 flex flex-col gap-8">
        {features.map(({ id, icon: Icon, tag, headline, body, points }, i) => (
          <div
            key={id}
            className={`rounded-[20px] border border-[#334155]/70 bg-[#1E293B]/80 p-7 sm:p-10 flex flex-col ${i % 2 === 1 ? "sm:flex-row-reverse" : "sm:flex-row"} gap-8 items-start`}
          >
            <div className="shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                <Icon size={26} className="text-[#818CF8]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[#818CF8] text-xs font-semibold uppercase tracking-widest">{tag}</span>
              <h2 className="text-[#F8FAFC] font-bold text-2xl mt-2 mb-3 leading-snug">{headline}</h2>
              <p className="text-[#CBD5E1] text-base leading-relaxed mb-5">{body}</p>
              <ul className="flex flex-col gap-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <Check size={16} className="text-[#10B981] mt-0.5 shrink-0" />
                    <span className="text-[#94A3B8] text-sm">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      {/* Comparison table */}
      <section className="max-w-3xl mx-auto px-5 pb-20 w-full">
        <h2 className="text-[#F8FAFC] font-bold text-2xl mb-1 text-center">How DuePulse compares</h2>
        <p className="text-[#94A3B8] text-sm text-center mb-8">vs. setting a reminder vs. a calendar app</p>
        <div className="rounded-[18px] border border-[#334155]/70 bg-[#1E293B] overflow-hidden">
          <div className="grid grid-cols-4 border-b border-[#334155]/70">
            <div className="px-5 py-3 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Feature</div>
            <div className="px-4 py-3 text-center text-[#818CF8] text-xs font-semibold uppercase tracking-wider border-l border-[#334155]/70">DuePulse</div>
            <div className="px-4 py-3 text-center text-[#94A3B8] text-xs font-semibold uppercase tracking-wider border-l border-[#334155]/70">Reminders</div>
            <div className="px-4 py-3 text-center text-[#94A3B8] text-xs font-semibold uppercase tracking-wider border-l border-[#334155]/70">Calendar</div>
          </div>
          {comparison.map((row, i) => (
            <div key={row.label} className={`grid grid-cols-4 ${i < comparison.length - 1 ? "border-b border-[#334155]/40" : ""}`}>
              <div className="px-5 py-3.5 text-[#CBD5E1] text-sm">{row.label}</div>
              {[row.duepulse, row.reminders, row.calendar].map((val, ci) => (
                <div key={ci} className={`px-4 py-3.5 flex justify-center border-l border-[#334155]/40 ${ci === 0 ? "bg-[#6366F1]/5" : ""}`}>
                  {val ? <Check size={16} className="text-[#10B981]" /> : <X size={16} className="text-[#334155]" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-5 pb-24 text-center">
        <div className="rounded-[20px] border border-[#6366F1]/25 bg-[#6366F1]/8 p-10">
          <h2 className="text-[#F8FAFC] font-bold text-2xl mb-3">Ready to stop guessing?</h2>
          <p className="text-[#CBD5E1] text-base mb-6 max-w-md mx-auto">
            Connect your Canvas account and DuePulse starts learning immediately.
          </p>
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
