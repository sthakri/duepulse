# Design System — DuePulse Midnight Sync

Dark theme only. No light mode.

## Brand Feel

Premium student productivity dashboard — calm, focused, modern, academic.  
Not a generic AI SaaS landing page.

**Avoid:** gold/yellow accents, warm editorial styling, neon purple, excessive empty space, low contrast, too many accent colors on one screen.

**Use:** deep navy backgrounds, indigo primary actions, sky blue secondary highlights, clean white headings, soft blue-gray body text, subtle borders, compact spacing.

## Core Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0F172A` | Page background |
| `--bg-deep` | `#08111F` | Hero/nav background |
| `--surface` | `#1E293B` | Card background |
| `--surface-elevated` | `#243044` | Elevated card |
| `--sidebar` | `#0B1120` | Sidebar background |
| `--border` | `#334155` | Borders (use `/70` opacity for subtle) |
| `--text-main` | `#F8FAFC` | Headings, main text |
| `--text-body` | `#CBD5E1` | Body text |
| `--text-muted` | `#94A3B8` | Muted/helper text |
| `--text-disabled` | `#64748B` | Disabled/placeholder |
| `--primary` | `#6366F1` | CTAs, active nav, links, focus rings |
| `--primary-hover` | `#818CF8` | Hover state for primary |
| `--secondary` | `#38BDF8` | Info highlights, secondary accents |
| `--danger` | `#EF4444` | Overdue, critical warnings |
| `--warning` | `#F59E0B` | Due soon, medium urgency |
| `--success` | `#10B981` | Completed, enabled, safe |

## Typography

**Font:** Manrope via `next/font/google` as `--font-sans`.  
Fallback: Inter only if Manrope unavailable.

```tsx
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
```

## Tailwind Usage

Always use arbitrary colors. Never rely on default Tailwind slate/indigo.

### Page
```tsx
className="min-h-screen bg-[#0F172A] text-[#F8FAFC]"
```

### Landing page background (radial)
```tsx
className="min-h-screen bg-[radial-gradient(circle_at_top,#111C33_0%,#0F172A_45%,#08111F_100%)] text-[#F8FAFC]"
```

### Navbar
```tsx
className="border-b border-[#334155]/60 bg-[#08111F]/80 backdrop-blur-xl"
```

### Card
```tsx
className="rounded-[18px] border border-[#334155]/70 bg-[#1E293B]/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
```

### Elevated card
```tsx
className="rounded-[18px] border border-[#334155] bg-[#243044] p-5"
```

### Sidebar
```tsx
className="bg-[#0B1120] border-r border-[#334155]/70"
```

## Components

### Logo
```tsx
<Link href="/" className="flex items-center gap-2">
  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
    <Zap size={16} className="text-[#818CF8]" fill="#818CF8" />
  </div>
  <span className="font-bold tracking-tight text-[#F8FAFC]">DuePulse</span>
</Link>
```

### Primary Button
```tsx
<Button className="rounded-xl bg-[#6366F1] px-5 py-2.5 font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.35)] hover:bg-[#818CF8]">
```

### Secondary Button
```tsx
<Button className="rounded-xl border border-[#334155] bg-[#1E293B] px-5 py-2.5 font-semibold text-[#CBD5E1] hover:bg-[#243044] hover:text-[#F8FAFC]">
```

### Ghost Button
```tsx
<Button className="rounded-xl bg-transparent px-4 py-2 text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]">
```

### Input
```tsx
<Input className="rounded-xl border-[#334155] bg-[#0F172A] text-[#F8FAFC] placeholder:text-[#64748B] focus-visible:ring-[#6366F1]" />
```

### Select
```tsx
<SelectTrigger className="rounded-xl border-[#334155] bg-[#0F172A] text-[#F8FAFC] focus:ring-[#6366F1]">
```

### Badge — Default
```tsx
<span className="inline-flex items-center rounded-full border border-[#334155] bg-[#1E293B] px-3 py-1 text-xs font-medium text-[#CBD5E1]">
```

### Badge — Primary (indigo)
```tsx
<span className="inline-flex items-center rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-3 py-1 text-xs font-medium text-[#818CF8]">
```

### Badge — Info (sky blue)
```tsx
<span className="inline-flex items-center rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-1 text-xs font-medium text-[#38BDF8]">
```

### Badge — Warning (amber)
```tsx
<span className="inline-flex items-center rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#F59E0B]">
```

### Badge — Danger (red)
```tsx
<span className="inline-flex items-center rounded-full border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-1 text-xs font-medium text-[#EF4444]">
```

### Badge — Success (emerald)
```tsx
<span className="inline-flex items-center rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-1 text-xs font-medium text-[#10B981]">
```

### Modal/Dialog
```tsx
<DialogContent className="rounded-[22px] border border-[#334155] bg-[#1E293B] text-[#F8FAFC] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
```

### Hero Section
```tsx
<section className="mx-auto flex max-w-5xl flex-col items-center px-5 pt-20 pb-16 text-center">
  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-4 py-1.5 text-sm font-medium text-[#CBD5E1]">
    <Zap size={14} className="text-[#818CF8]" />
    Eyebrow
  </div>
  <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-[#F8FAFC] md:text-6xl">
    Headline <span className="text-[#6366F1]">highlight.</span>
  </h1>
  <p className="mt-5 max-w-2xl text-base leading-7 text-[#CBD5E1] md:text-lg">Body</p>
  <Button className="mt-8 rounded-xl bg-[#6366F1] px-6 py-3 font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.35)] hover:bg-[#818CF8]">CTA →</Button>
</section>
```

### Page Header (Dashboard)
```tsx
<div className="mb-6 flex flex-col gap-3 border-b border-[#334155]/70 pb-5 md:flex-row md:items-center md:justify-between">
  <div>
    <p className="text-sm font-medium text-[#818CF8]">Section</p>
    <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F8FAFC]">Title</h1>
    <p className="mt-1 text-sm text-[#94A3B8]">Description</p>
  </div>
  <Button className="rounded-xl bg-[#6366F1] px-5 py-2.5 font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.35)] hover:bg-[#818CF8]">Action</Button>
</div>
```

### Stats Card
```tsx
<div className="rounded-[18px] border border-[#334155]/70 bg-[#1E293B]/80 p-5">
  <p className="text-sm font-medium text-[#94A3B8]">Label</p>
  <div className="mt-3 flex items-end justify-between">
    <h3 className="text-3xl font-bold text-[#F8FAFC]">Value</h3>
    <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">Status</span>
  </div>
</div>
```

### Assignment Card
```tsx
<div className="rounded-[18px] border border-[#334155]/70 bg-[#1E293B]/80 p-5 transition hover:border-[#6366F1]/40 hover:bg-[#243044]/80">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="font-semibold text-[#F8FAFC]">Title</h3>
      <p className="mt-1 text-sm text-[#94A3B8]">Due info</p>
    </div>
    <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#F59E0B]">Due Soon</span>
  </div>
</div>
```

### Sidebar Nav
```tsx
<aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-[#334155]/70 bg-[#0B1120] lg:flex">
  <div className="border-b border-[#334155]/70 px-5 py-5">
    {/* Logo */}
  </div>
  <nav className="flex-1 space-y-1 px-3 py-4">
    {/* Active */}
    <Link href="/dashboard" className="flex items-center gap-3 rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/12 px-3 py-2.5 text-sm font-medium text-[#818CF8]">
      <LayoutDashboard size={17} className="text-[#818CF8]" />
      Dashboard
    </Link>
    {/* Inactive */}
    <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#CBD5E1]">
      <Settings size={17} />
      Settings
    </Link>
  </nav>
</aside>
```

### Dashboard Layout
```tsx
<div className="flex min-h-screen bg-[#0F172A] text-[#F8FAFC]">
  <DashboardSidebar />
  <main className="flex-1">
    <div className="mx-auto max-w-7xl px-5 py-6">{/* content */}</div>
  </main>
</div>
```

## Color Usage Rules

- **Indigo** (`#6366F1` / `#818CF8`): CTAs, active nav, selected states, links, focus rings, logo glow
- **Sky blue** (`#38BDF8`): Secondary highlights, info badges, reminders
- **Emerald** (`#10B981`): Success, completed, enabled, safe states
- **Amber** (`#F59E0B`): Due-soon, warnings, medium urgency
- **Red** (`#EF4444`): Overdue, destructive, critical only
- **White** (`#F8FAFC`): Important headings only
- **Muted** (`#94A3B8`): Descriptions, timestamps, helper text, secondary labels
- No gold as primary brand color
- No random violet/cyan/pink/green gradients outside defined status states

## Spacing

- Landing page sections: `py-16` / `py-20`
- Dashboard sections: `py-6`
- Card padding: `p-5` / `p-6`
- Buttons: `px-5 py-2.5`
- Small components: `px-3 py-2`
- Avoid excessive hero height

## Borders & Shadows

- Prefer borders over heavy shadows
- Card shadow: `shadow-[0_20px_60px_rgba(0,0,0,0.25)]`
- Indigo glow (CTA/logo only): `shadow-[0_12px_35px_rgba(99,102,241,0.35)]`
- Never apply glow to every card or icon

## Accessibility

- Keep text readable on dark backgrounds
- Never use muted text for important info
- Don't rely on color alone for urgency — always include text labels like "Overdue", "Due Soon", "Completed"
- Buttons need clear hover states
- Inputs need visible focus rings
- Cards must contrast from page background

## shadcn/ui Overrides

Always pass `className`:

```tsx
<Button className="bg-[#6366F1] text-white hover:bg-[#818CF8]">
<Card className="border-[#334155] bg-[#1E293B] text-[#F8FAFC]">
<Input className="border-[#334155] bg-[#0F172A] text-[#F8FAFC]">
<DialogContent className="border-[#334155] bg-[#1E293B] text-[#F8FAFC]">
```
