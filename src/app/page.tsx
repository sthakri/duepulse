import Link from "next/link";
import { BookOpen, Brain, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function HomePage() {
  return (
    <main className="flex flex-col flex-1 bg-slate-900">
      <section className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-white font-semibold text-4xl md:text-5xl max-w-2xl leading-tight">
          Your deadlines, your brain, finally in sync.
        </h1>
        <p className="text-slate-300 text-lg mt-4 max-w-xl">
          DuePulse connects to Canvas LMS, learns when you actually focus, and
          nudges you at exactly the right moment.
        </p>
        <Button
          asChild
          className="bg-indigo-500 hover:bg-indigo-600 text-white mt-8 px-6 py-3 text-base h-auto w-full sm:w-auto"
        >
          <Link href="/onboarding">Connect Your Canvas →</Link>
        </Button>
      </section>

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
