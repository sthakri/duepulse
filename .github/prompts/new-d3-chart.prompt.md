---
description: "Scaffold a new D3 chart component for DuePulse following project conventions"
name: "New D3 Chart"
argument-hint: "Describe the chart (e.g. 'bar chart of assignment scores by course')"
agent: "agent"
---

Create a new D3 chart component for DuePulse. The chart to build: $input

## Requirements

### Reference files to read first

- [`src/components/WorkloadHeatmap.tsx`](../../src/components/WorkloadHeatmap.tsx) — canonical D3 grid chart pattern (SVG refs, useEffect cleanup, responsive sizing)
- [`src/components/ProductiveWindowsChart.tsx`](../../src/components/ProductiveWindowsChart.tsx) — simpler aggregation + render pattern

### Component rules

- Add `"use client";` at the top — D3 requires browser APIs
- Use `useRef<SVGSVGElement>` for the SVG element and `useRef<HTMLDivElement>` for the wrapper
- In `useEffect`: call `d3.select(svgRef.current).selectAll("*").remove()` first to prevent duplicate renders
- Guard for null ref: `if (!svg) return;`
- Accept data via typed `Props` interface — no `any`

### Design system

Follow [`docs/DESIGN.md`](../../docs/DESIGN.md):

- Background: `bg-slate-800`, card wrapper: `rounded-xl bg-slate-800 p-4`
- Text: `text-white` headings, `text-slate-300` body, `text-slate-400` muted/empty states
- Accent color: `#6366f1` (indigo-500). Danger: `#ef4444`. Safe: `#34d399`
- D3 color scales should map from dark slate (`#1e3a5f`) → accent/danger

### File location

Place the new component in `src/components/`. Name it in PascalCase matching the chart's purpose (e.g. `ScoresByCoursChart.tsx`).

### Empty / loading state

Always render a graceful fallback inside the card wrapper when data is empty or insufficient (see `ProductiveWindowsChart` for the `data.length < 5` pattern).

### Do not use

Recharts, Chart.js, or any charting library other than `d3`. No inline styles except for dynamic values (e.g. `style={{ color: course.color }}`).
