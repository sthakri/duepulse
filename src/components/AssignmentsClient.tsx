"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AssignmentCard from "@/components/AssignmentCard";
import SyncNowButton from "@/components/SyncNowButton";
import { BookOpen, RefreshCw } from "lucide-react";

type Course = { name: string; color: string };
type Assignment = { id: string; title: string; due_at: string | null; points_possible: number | null; canvas_assignment_id: number; course_id: string; courses: Course | null };
type Filter = "all" | "overdue" | "due-soon" | "upcoming" | "no-date";

interface Props { assignments: Assignment[]; userId: string; hasCanvas: boolean; userTz: string }

function classifyAssignment(a: Assignment): Filter {
  if (!a.due_at) return "no-date";
  const now = new Date();
  const due = new Date(a.due_at);
  const ms = due.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 24 * 60 * 60 * 1000) return "due-soon";
  return "upcoming";
}

const FILTER_LABELS: Record<Filter, string> = { all: "All", overdue: "Overdue", "due-soon": "Due Soon", upcoming: "Upcoming", "no-date": "No Date" };
const FILTER_COLORS: Record<Filter, string> = { all: "", overdue: "text-[#EF4444]", "due-soon": "text-[#F59E0B]", upcoming: "text-[#10B981]", "no-date": "text-[#64748B]" };

export default function AssignmentsClient({ assignments, userId, hasCanvas, userTz }: Props) {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter") as Filter | null;
  const [activeFilter, setActiveFilter] = useState<Filter>(
    urlFilter && ["all","overdue","due-soon","upcoming","no-date"].includes(urlFilter) ? urlFilter : "all"
  );
  const [activeCourse, setActiveCourse] = useState<string | null>(null);

  useEffect(() => {
    if (urlFilter && ["all","overdue","due-soon","upcoming","no-date"].includes(urlFilter)) setActiveFilter(urlFilter as Filter);
  }, [urlFilter]);

  const courses = Array.from(new Map(assignments.filter((a) => a.courses).map((a) => [a.course_id, a.courses!])).entries()).map(([id, course]) => ({ id, ...course }));
  const counts: Record<Filter, number> = { all: assignments.length, overdue: 0, "due-soon": 0, upcoming: 0, "no-date": 0 };
  for (const a of assignments) counts[classifyAssignment(a)]++;

  const filtered = assignments.filter((a) => {
    const matchesFilter = activeFilter === "all" || classifyAssignment(a) === activeFilter;
    const matchesCourse = !activeCourse || a.course_id === activeCourse;
    return matchesFilter && matchesCourse;
  });

  if (!hasCanvas) return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#243044] border border-[#334155] flex items-center justify-center mb-5"><BookOpen size={26} className="text-[#64748B]" /></div>
      <h2 className="text-[#F8FAFC] font-bold text-xl mb-2">Connect Canvas first</h2>
      <p className="text-[#64748B] text-sm leading-relaxed max-w-xs mb-6">Go to Settings and add your Canvas domain and API token to start pulling in your assignments.</p>
      <a href="/dashboard/settings" className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold text-sm px-5 py-2.5 transition-colors">Go to Settings</a>
    </div>
  );

  if (assignments.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#243044] border border-[#334155] flex items-center justify-center mb-5"><RefreshCw size={24} className="text-[#64748B]" /></div>
      <h2 className="text-[#F8FAFC] font-bold text-xl mb-2">No assignments yet</h2>
      <p className="text-[#64748B] text-sm leading-relaxed max-w-xs mb-6">Sync your Canvas account to load your assignments.</p>
      <SyncNowButton userId={userId} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const count = counts[f];
          if (f !== "all" && count === 0) return null;
          const isActive = activeFilter === f;
          return (
            <button key={f} type="button" onClick={() => setActiveFilter(f)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all border ${isActive ? "bg-[#6366F1]/12 border-[#6366F1]/25 text-[#818CF8]" : "bg-[#1E293B]/60 border-[#334155] text-[#64748B] hover:text-[#94A3B8] hover:bg-[#1E293B]"}`}>
              <span className={isActive ? "text-[#818CF8]" : FILTER_COLORS[f]}>{FILTER_LABELS[f]}</span>
              <span className={`text-xs rounded-md px-1.5 py-0.5 ${isActive ? "bg-[#6366F1]/20 text-[#818CF8]" : "bg-[#334155] text-[#64748B]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Course pills */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#64748B] text-xs">Course:</span>
          <button type="button" onClick={() => setActiveCourse(null)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${!activeCourse ? "bg-[#6366F1]/12 border-[#6366F1]/25 text-[#818CF8]" : "bg-[#1E293B] border-[#334155] text-[#64748B] hover:text-[#94A3B8]"}`}>
            All
          </button>
          {courses.map(({ id, name, color }) => (
            <button key={id} type="button" onClick={() => setActiveCourse(activeCourse === id ? null : id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${activeCourse === id ? "text-[#F8FAFC]" : "bg-[#1E293B] border-[#334155] text-[#64748B] hover:text-[#94A3B8]"}`}
              style={activeCourse === id ? { backgroundColor: `${color}22`, borderColor: `${color}44`, color } : undefined}>
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[#F8FAFC] font-semibold text-base mb-1">No assignments match this filter</p>
          <p className="text-[#64748B] text-sm">Try selecting a different filter above.</p>
          <button type="button" onClick={() => { setActiveFilter("all"); setActiveCourse(null); }} className="mt-4 text-[#818CF8] hover:text-[#6366F1] text-sm font-medium transition-colors bg-transparent">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <AssignmentCard key={a.id} title={a.title} course_name={a.courses?.name ?? "Unknown Course"} due_at={a.due_at} points_possible={a.points_possible !== null ? Number(a.points_possible) : null} canvas_assignment_id={String(a.canvas_assignment_id)} course_color={a.courses?.color ?? "#6366F1"} userTz={userTz} />
          ))}
        </div>
      )}
    </div>
  );
}
