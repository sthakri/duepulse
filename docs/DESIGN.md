# Design System

Dark theme always. No light mode.

Backgrounds: bg-slate-900 (pages), bg-slate-800 (cards)
Accent: indigo-500 (#6366f1)
Danger: red-500 | Warning: amber-400 | Safe: emerald-400
Text: text-white (headings), text-slate-300 (body), text-slate-400 (muted)
Cards: rounded-xl bg-slate-800 p-4
Font: Inter via next/font/google

Card pattern:

<div className="rounded-xl bg-slate-800 p-4">
  <h2 className="text-white font-semibold text-lg">Title</h2>
  <p className="text-slate-300 text-sm mt-1">Body</p>
</div>

shadcn/ui overrides: always pass className to override default light styles.
Example: <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
