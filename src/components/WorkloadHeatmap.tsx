'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Props {
  data: Array<{ due_at: string; assignment_count: number }>
}

interface DayEntry {
  date: Date
  dateStr: string
  col: number
  row: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export default function WorkloadHeatmap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove()

    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return

    const cellSize = 16
    const gap = 3
    const step = cellSize + gap
    const marginTop = 40
    const marginLeft = 30
    const xAxisHeight = 24
    const legendHeight = 36
    const gridH = 7 * step - gap
    const svgHeight = marginTop + gridH + xAxisHeight + legendHeight

    const countMap = new Map<string, number>()
    for (const row of data) {
      const key = row.due_at.slice(0, 10)
      countMap.set(key, (countMap.get(key) ?? 0) + row.assignment_count)
    }

    const counts = Array.from(countMap.values())
    const maxDomain = counts.length > 0 ? Math.max(5, ...counts) : 5
    const colorScale = d3
      .scaleSequential(d3.interpolateRgb('#1e293b', '#ef4444'))
      .domain([0, maxDomain])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = localDateStr(today)

    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))

    const days: DayEntry[] = Array.from({ length: 42 }, (_, i) => {
      const col = Math.floor(i / 7)
      const row = i % 7
      const d = new Date(monday)
      d.setDate(monday.getDate() + col * 7 + row)
      return { date: d, dateStr: localDateStr(d), col, row }
    })

    const weekStarts: Date[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i * 7)
      return d
    })

    function redraw(containerWidth: number) {
      d3.select(svg).selectAll('*').remove()

      const svgSel = d3.select(svg)
        .attr('width', containerWidth)
        .attr('height', svgHeight)

      svgSel.append('text')
        .attr('x', marginLeft)
        .attr('y', 22)
        .attr('fill', 'white')
        .attr('font-weight', '600')
        .attr('font-size', '14px')
        .text('Workload — Next 6 Weeks')

      svgSel.selectAll<SVGTextElement, string>('text.dy')
        .data(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
        .join('text')
        .attr('class', 'dy')
        .attr('x', marginLeft - 6)
        .attr('y', (_, i) => marginTop + i * step + cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .text(l => l)

      svgSel.selectAll<SVGTextElement, Date>('text.wk')
        .data(weekStarts)
        .join('text')
        .attr('class', 'wk')
        .attr('x', (_, i) => marginLeft + i * step + cellSize / 2)
        .attr('y', marginTop + gridH + xAxisHeight - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .text(d => fmtShort(d))

      const cellGroups = svgSel.selectAll<SVGGElement, DayEntry>('g.cell')
        .data(days)
        .join('g')
        .attr('class', 'cell')

      cellGroups.append('rect')
        .attr('x', d => marginLeft + d.col * step)
        .attr('y', d => marginTop + d.row * step)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 2)
        .attr('fill', d => colorScale(countMap.get(d.dateStr) ?? 0))
        .attr('stroke', d => d.dateStr === todayStr ? '#6366f1' : 'none')
        .attr('stroke-width', d => d.dateStr === todayStr ? 2 : 0)

      cellGroups.append('title')
        .text(d => {
          const n = countMap.get(d.dateStr) ?? 0
          return `${fmtShort(d.date)} — ${n} assignment${n === 1 ? '' : 's'}`
        })

      const legendY = marginTop + gridH + xAxisHeight + 10
      const swatchSize = 12
      const swatchGap = 4
      const legendDomain = [0, maxDomain * 0.25, maxDomain * 0.5, maxDomain * 0.75, maxDomain]
      const swatchStartX = marginLeft + 26

      svgSel.append('text')
        .attr('x', marginLeft)
        .attr('y', legendY + swatchSize - 1)
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .text('Low')

      svgSel.selectAll<SVGRectElement, number>('rect.ls')
        .data(legendDomain)
        .join('rect')
        .attr('class', 'ls')
        .attr('x', (_, i) => swatchStartX + i * (swatchSize + swatchGap))
        .attr('y', legendY)
        .attr('width', swatchSize)
        .attr('height', swatchSize)
        .attr('rx', 2)
        .attr('fill', v => colorScale(v))

      svgSel.append('text')
        .attr('x', swatchStartX + legendDomain.length * (swatchSize + swatchGap))
        .attr('y', legendY + swatchSize - 1)
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .text('High')
    }

    const cs = window.getComputedStyle(container)
    const initWidth = container.clientWidth
      - parseFloat(cs.paddingLeft)
      - parseFloat(cs.paddingRight)

    const ro = new ResizeObserver(entries => {
      redraw(entries[0].contentRect.width)
    })
    ro.observe(container)
    redraw(initWidth)

    return () => ro.disconnect()
  }, [data])

  return (
    <div ref={containerRef} className="rounded-xl bg-slate-800 p-4">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
