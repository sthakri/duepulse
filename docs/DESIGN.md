# Design System — DuePulse Midnight Academic

Dark theme always. No light mode.

## Brand Feel
DuePulse should feel like a premium academic productivity dashboard, not a generic AI SaaS app.  
The design should be calm, focused, human-designed, and slightly editorial.

Avoid:
- Neon purple gradients
- Over-glowing buttons
- Too much empty vertical space
- Generic bg-slate-900 / bg-slate-800 look
- Bright AI-style purple/blue styling
- Any indigo/violet color references

Use:
- Deep charcoal backgrounds
- Warm gold primary actions
- Sage green success states
- Soft clay red for overdue/danger only
- Subtle borders, soft shadows, clean spacing

## Colors

Background:
- Page background: #0C111B
- Surface/card: #151C2B
- Elevated surface: #1C2637
- Sidebar: #0E1320 (slightly darker than page)
- Border: #2A3444

Text:
- Main text: #F6F1E8
- Body text: #AAB4C4
- Muted text: #7E8AA0

Accents:
- Primary accent / CTA: #D6B36A
- Primary hover: #E0BF78
- Success / safe / nudges enabled: #7FAE9D
- Danger / overdue: #C97064
- Warning: #D6B36A (same as primary — use border/bg opacity to distinguish)

## Tailwind Usage

Use Tailwind arbitrary colors instead of default slate/indigo.

Page:
bg-[#0C111B] text-[#F6F1E8]

Cards:
rounded-[18px] bg-[#151C2B] border border-[#2A3444] shadow-[0_20px_60px_rgba(0,0,0,0.25)]

Elevated cards:
rounded-[18px] bg-[#1C2637] border border-[#2A3444]

Sidebar:
bg-[#0E1320] border-r border-[#2A3444]

Muted text:
text-[#AAB4C4]

Primary button:
bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold rounded-xl shadow-none

Success:
text-[#7FAE9D]

Danger:
text-[#C97064]

## Typography

Font: Manrope via next/font/google (variable: --font-sans).
Fallback: Inter is acceptable only if Manrope is not available.

Headings should be bold, clean, and premium.
Use slightly tighter line-height for hero headings.

## Card Pattern

```tsx
<div className="rounded-[18px] border border-[#2A3444] bg-[#151C2B] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
  <h2 className="text-[#F6F1E8] font-semibold text-lg">Title</h2>
  <p className="text-[#AAB4C4] text-sm mt-1">Body</p>
</div>
```

## Button Pattern

```tsx
<Button className="rounded-xl bg-[#D6B36A] px-5 py-2.5 font-semibold text-[#0C111B] shadow-none hover:bg-[#E0BF78]">
  Button Text
</Button>
```

## Input Pattern

```tsx
<Input className="rounded-xl border-[#2A3444] bg-[#0C111B] text-[#F6F1E8] placeholder:text-[#7E8AA0] focus-visible:ring-[#D6B36A]" />
```

## shadcn/ui Overrides

Always pass className to override default light styles.

Examples:

```tsx
<Button className="bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B]">
<Card className="bg-[#151C2B] border-[#2A3444] text-[#F6F1E8]">
<Input className="bg-[#0C111B] border-[#2A3444] text-[#F6F1E8]">
```

## Dashboard Sidebar Nav Pattern

The dashboard uses a persistent left sidebar (~224px wide) for navigation.

```tsx
<aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-[#2A3444] bg-[#0E1320] min-h-screen sticky top-0 h-screen">
  {/* Logo block */}
  <div className="px-5 py-5 border-b border-[#2A3444]">
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center">
        <Zap size={14} className="text-[#D6B36A]" fill="#D6B36A" />
      </div>
      <span className="font-bold text-[#F6F1E8] tracking-tight">DuePulse</span>
    </Link>
  </div>

  {/* Nav items */}
  <nav className="flex-1 px-3 py-4 space-y-1">
    {/* Active nav item */}
    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#D6B36A]/12 text-[#D6B36A] border border-[#D6B36A]/20">
      <LayoutDashboard size={17} className="text-[#D6B36A]" />
      Dashboard
    </Link>
    {/* Inactive nav item */}
    <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#7E8AA0] hover:text-[#AAB4C4] hover:bg-[#1C2637]">
      <Settings size={17} />
      Settings
    </Link>
  </nav>
</aside>
```

## Layout Rules

- Dashboard uses a flex row: sidebar (w-56) + main content (flex-1).
- Main content max-w-7xl with px-5 py-6 padding.
- Use max-w-6xl or max-w-7xl containers.
- Avoid huge empty vertical spacing.
- Keep hero sections centered but compact.
- Dashboard should feel dense, useful, and premium.
- Use borders more than shadows.
- Use gold only for primary actions, active nav states, and selected states.
- Use green only for success or enabled states (e.g. "Nudges enabled").
- Use red only for overdue or critical warnings.
- Logo pattern: Zap icon in gold on dark badge + bold text.