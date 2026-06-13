import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import StressAlert from "@/components/StressAlert";
import SyncNowButton from "@/components/SyncNowButton";
import AssignmentsClient from "@/components/AssignmentsClient";
import { RefreshCw } from "lucide-react";

export const metadata = { title: "Assignments — DuePulse" };

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const [{ data: assignments }, { data: profile }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, points_possible, canvas_assignment_id, course_id, courses(name, color)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("canvas_token, canvas_domain, timezone, updated_at").eq("id", userId).single(),
  ]);

  const now = new Date();
  const userTz = profile?.timezone ?? "America/Chicago";
  const hasCanvas = !!(profile?.canvas_token && profile?.canvas_domain);

  const lastSynced = profile?.updated_at ? (() => {
    const diff = Math.floor((now.getTime() - new Date(profile.updated_at).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalised = (assignments ?? []).map((a: any) => ({
    ...a,
    courses: Array.isArray(a.courses) ? (a.courses[0] ?? null) : (a.courses ?? null),
  }));

  return (
    <>
      <header className="border-b border-[#334155]/70 bg-[#0F172A] sticky top-0 z-30 h-[57px]">
        <div className="pl-14 lg:pl-0 px-5 h-full flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-[#F8FAFC] font-semibold text-base">Assignments</h1>
            {lastSynced && (
              <span className="hidden sm:flex items-center gap-1.5 text-[#64748B] text-xs">
                <RefreshCw size={11} />
                Last sync: {lastSynced}
              </span>
            )}
          </div>
          {hasCanvas && <SyncNowButton userId={userId} />}
        </div>
      </header>

      <main className="flex-1 px-5 py-6 sm:px-6 sm:py-7 max-w-7xl w-full mx-auto">
        <div className="mb-5">
          <StressAlert userId={userId} />
        </div>
        <Suspense>
          <AssignmentsClient assignments={normalised} userId={userId} hasCanvas={hasCanvas} userTz={userTz} />
        </Suspense>
      </main>
    </>
  );
}
