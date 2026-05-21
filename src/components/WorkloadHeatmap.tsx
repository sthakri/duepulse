"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Props {
  data: Array<{ due_at: string; assignment_count: number }>;
}

interface DayEntry {
  date: Date;
  dateStr: string;
  col: number;
  row: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function WorkloadHeatmap({ data }: Props) {
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
    const colorScale = d3
      .scaleSequential(d3.interpolateRgb("#1e3a5f", "#ef4444"))
      .domain([0, maxDomain]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = localDateStr(today);

    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

    const days: DayEntry[] = Array.from({ length: 42 }, (_, i) => {
      const col = Math.floor(i / 7);
      const row = i % 7;
      const d = new Date(monday);
      d.setDate(monday.getDate() + col * 7 + row);
      return { date: d, dateStr: localDateStr(d), col, row };
    });

    const weekStarts: Date[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i * 7);
      return d;
    });

    function redraw() {
      d3.select(svg).selectAll("*").remove();

      const svgSel = d3
        .select(svg)
        .attr("viewBox", `0 0 ${contentWidth} ${svgHeight}`)
        .attr("width", "100%");

      svgSel
        .selectAll<SVGTextElement, string>("text.dy")
        .data(["M", "T", "W", "T", "F", "S", "S"])
        .join("text")
        .attr("class", "dy")
        .attr("x", marginLeft - 8)
        .attr("y", (_, i) => marginTop + i * step + cellSize / 2 + 4)
        .attr("text-anchor", "end")
        .attr("fill", "#94a3b8")
        .attr("font-size", "10px")
        .text((l) => l);

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
        .attr("fill", "#94a3b8")
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
        .attr("rx", 3)
        .attr("fill", (d) => colorScale(countMap.get(d.dateStr) ?? 0))
        .attr("stroke", (d) => (d.dateStr === todayStr ? "#6366f1" : "#334155"))
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

      const legendY = marginTop + gridH + xAxisHeight + 10;
      const swatchSize = 14;
      const swatchGap = 4;
      const legendDomain = [
        0,
        maxDomain * 0.25,
        maxDomain * 0.5,
        maxDomain * 0.75,
        maxDomain,
      ];
      const swatchStartX = marginLeft + 26;

      svgSel
        .append("text")
        .attr("x", marginLeft)
        .attr("y", legendY + swatchSize - 1)
        .attr("fill", "#94a3b8")
        .attr("font-size", "11px")
        .text("Low");

      svgSel
        .selectAll<SVGRectElement, number>("rect.ls")
        .data(legendDomain)
        .join("rect")
        .attr("class", "ls")
        .attr("x", (_, i) => swatchStartX + i * (swatchSize + swatchGap))
        .attr("y", legendY)
        .attr("width", swatchSize)
        .attr("height", swatchSize)
        .attr("rx", 2)
        .attr("fill", (v) => colorScale(v));

      svgSel
        .append("text")
        .attr(
          "x",
          swatchStartX + legendDomain.length * (swatchSize + swatchGap),
        )
        .attr("y", legendY + swatchSize - 1)
        .attr("fill", "#94a3b8")
        .attr("font-size", "11px")
        .text("High");
    }

    redraw();

    const ro = new ResizeObserver(() => redraw());
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className="rounded-xl bg-slate-800 p-4 sm:p-6">
      <p className="text-white font-semibold text-lg mb-4 text-center">
        Workload — Next 6 Weeks
      </p>
      <div ref={wrapperRef} className="w-full max-w-85 mx-auto">
        <svg ref={svgRef} className="w-full h-auto block" />
      </div>
    </div>
  );
}
