"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { getLocalDate, getLocalDay } from "@/lib/time";

interface Props {
  data: Array<{ due_at: string; assignment_count: number }>;
  userTz: string;
}

interface DayEntry {
  date: Date;
  dateStr: string;
  col: number;
  row: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtShort(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export default function WorkloadHeatmap({ data, userTz }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = svgRef.current;
    if (!svg) return;

    const cellSize = 44;
    const gap = 6;
    const step = cellSize + gap;
    const marginTop = 6;
    const marginLeft = 36;
    const xAxisHeight = 46;
    const legendHeight = 40;
    const gridH = 7 * step - gap;
    const svgHeight = marginTop + gridH + xAxisHeight + legendHeight;
    const contentWidth = marginLeft + 6 * step + 4;

    const countMap = new Map<string, number>();
    for (const row of data) {
      const key = row.due_at.slice(0, 10);
      countMap.set(key, (countMap.get(key) ?? 0) + row.assignment_count);
    }

    const counts = Array.from(countMap.values());
    const maxDomain = counts.length > 0 ? Math.max(5, ...counts) : 5;

    // Color scale: empty navy → heavy indigo (Midnight Sync palette)
    const colorScale = d3
      .scaleSequential(d3.interpolateRgb("#243044", "#6366F1"))
      .domain([0, maxDomain]);

    const now = new Date();
    const todayStr = getLocalDate(now, userTz);
    const todayDow = getLocalDay(now, userTz);

    const dowOff = todayDow === 0 ? -6 : 1 - todayDow;
    const monday = new Date(now.getTime() + dowOff * 86_400_000);

    const days: DayEntry[] = Array.from({ length: 42 }, (_, i) => {
      const col = Math.floor(i / 7);
      const row = i % 7;
      const dt = new Date(monday.getTime() + (col * 7 + row) * 86_400_000);
      const dateStr = getLocalDate(dt, userTz);
      const [y, m, d] = dateStr.split("-").map(Number);
      return { date: new Date(Date.UTC(y, m - 1, d)), dateStr, col, row };
    });

    const weekStarts: Date[] = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(monday.getTime() + i * 7 * 86_400_000);
      const [y, m, d] = getLocalDate(dt, userTz).split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    });

    function redraw() {
      d3.select(svg).selectAll("*").remove();

      const svgSel = d3
        .select(svg)
        .attr("viewBox", `0 0 ${contentWidth} ${svgHeight}`)
        .attr("width", "100%");

      // Day-of-week labels
      svgSel
        .selectAll<SVGTextElement, string>("text.dy")
        .data(["M", "T", "W", "T", "F", "S", "S"])
        .join("text")
        .attr("class", "dy")
        .attr("x", marginLeft - 8)
        .attr("y", (_, i) => marginTop + i * step + cellSize / 2 + 4)
        .attr("text-anchor", "end")
        .attr("fill", "#64748B")
        .attr("font-size", "10px")
        .text((l) => l);

      // Week-start labels
      svgSel
        .selectAll<SVGTextElement, Date>("text.wk")
        .data(weekStarts)
        .join("text")
        .attr("class", "wk")
        .attr(
          "transform",
          (_, i) =>
            `translate(${marginLeft + i * step + cellSize / 2}, ${marginTop + gridH + 8}) rotate(-45)`,
        )
        .attr("text-anchor", "end")
        .attr("fill", "#64748B")
        .attr("font-size", "10px")
        .text((d) => fmtShort(d));

      const cellGroups = svgSel
        .selectAll<SVGGElement, DayEntry>("g.cell")
        .data(days)
        .join("g")
        .attr("class", "cell");

      cellGroups
        .append("rect")
        .attr("x", (d) => marginLeft + d.col * step)
        .attr("y", (d) => marginTop + d.row * step)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("rx", 5)
        .attr("fill", (d) => colorScale(countMap.get(d.dateStr) ?? 0))
        .attr("stroke", (d) => (d.dateStr === todayStr ? "#818CF8" : "#334155"))
        .attr("stroke-width", (d) => (d.dateStr === todayStr ? 2 : 0.5));

      cellGroups.append("title").text((d) => {
        const n = countMap.get(d.dateStr) ?? 0;
        return `${fmtShort(d.date)} — ${n} assignment${n === 1 ? "" : "s"}`;
      });

      cellGroups
        .append("text")
        .attr("x", (d) => marginLeft + d.col * step + cellSize / 2)
        .attr("y", (d) => marginTop + d.row * step + cellSize / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("font-size", "13px")
        .attr("font-weight", "700")
        .attr("pointer-events", "none")
        .text((d) => {
          const n = countMap.get(d.dateStr) ?? 0;
          return n > 0 ? String(n) : "";
        });

      // Legend
      const legendY = marginTop + gridH + xAxisHeight + 10;
      const swatchSize = 14;
      const swatchGap = 4;
      const legendDomain = [0, maxDomain * 0.25, maxDomain * 0.5, maxDomain * 0.75, maxDomain];
      const swatchStartX = marginLeft + 26;

      svgSel.append("text").attr("x", marginLeft).attr("y", legendY + swatchSize - 1).attr("fill", "#64748B").attr("font-size", "11px").text("Low");

      svgSel
        .selectAll<SVGRectElement, number>("rect.ls")
        .data(legendDomain)
        .join("rect")
        .attr("class", "ls")
        .attr("x", (_, i) => swatchStartX + i * (swatchSize + swatchGap))
        .attr("y", legendY)
        .attr("width", swatchSize)
        .attr("height", swatchSize)
        .attr("rx", 3)
        .attr("fill", (v) => colorScale(v));

      svgSel
        .append("text")
        .attr("x", swatchStartX + legendDomain.length * (swatchSize + swatchGap))
        .attr("y", legendY + swatchSize - 1)
        .attr("fill", "#64748B")
        .attr("font-size", "11px")
        .text("High");
    }

    redraw();

    const ro = new ResizeObserver(() => redraw());
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [data, userTz]);

  return (
    <div className="rounded-[18px] bg-[#1E293B]/80 border border-[#334155]/70 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="mb-4">
        <p className="text-[#F8FAFC] font-semibold text-base">
          Workload — Next 6 Weeks
        </p>
      </div>
      <div ref={wrapperRef} className="w-full max-w-85 mx-auto">
        <svg ref={svgRef} className="w-full h-auto block" />
      </div>
    </div>
  );
}
