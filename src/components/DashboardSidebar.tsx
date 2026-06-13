"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Zap,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/assignments", label: "Assignments", icon: BookOpen },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar({
  email,
  initial,
}: {
  email?: string;
  initial?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapse preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar_collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
  }

  async function handleSignOut() {
    await createClient().auth.signOut({ scope: "global" });
    router.push("/");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              collapsed ? "justify-center" : "",
              active
                ? "border border-[#6366F1]/30 bg-[#6366F1]/12 text-[#818CF8]"
                : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#CBD5E1] border border-transparent",
            ].join(" ")}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className={active ? "text-[#818CF8]" : ""} />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── Mobile hamburger ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC]"
        aria-label="Open menu"
      >
        <Menu size={16} />
      </button>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-[#0F172A]/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-[#0B1120] border-r border-[#334155]/70 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5 border-b border-[#334155]/70">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15">
                  <Zap size={14} className="text-[#818CF8]" fill="#818CF8" />
                </div>
                <span className="font-bold text-[#F8FAFC] tracking-tight">DuePulse</span>
              </Link>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-[#64748B] hover:text-[#94A3B8] bg-transparent">
                <X size={18} />
              </button>
            </div>
            <NavItems onClick={() => setMobileOpen(false)} />
            <div className="border-t border-[#334155]/70">
              {email && initial && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#334155]/40">
                  <div className="w-7 h-7 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] font-semibold text-xs shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#F8FAFC] text-xs font-medium truncate">{email.split("@")[0]}</p>
                    <p className="text-[#64748B] text-[11px] truncate">{email}</p>
                  </div>
                </div>
              )}
              <div className="p-3">
                <button type="button" onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#EF4444] transition-colors bg-transparent border border-transparent">
                  <LogOut size={17} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={[
          "hidden lg:flex flex-col shrink-0 border-r border-[#334155]/70 bg-[#0B1120] min-h-screen sticky top-0 h-screen transition-all duration-200",
          collapsed ? "w-16" : "w-56",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-[#334155]/70 ${collapsed ? "justify-center px-2 py-5" : "px-5 py-5 justify-between"}`}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Zap size={14} className="text-[#818CF8]" fill="#818CF8" />
              </div>
              <span className="font-bold text-[#F8FAFC] tracking-tight">DuePulse</span>
            </Link>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15">
              <Zap size={14} className="text-[#818CF8]" fill="#818CF8" />
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className={`text-[#64748B] hover:text-[#94A3B8] bg-transparent transition-colors ${collapsed ? "hidden" : ""}`}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center py-2 text-[#64748B] hover:text-[#94A3B8] bg-transparent transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}

        <NavItems />

        {/* User info + sign out */}
        <div className="border-t border-[#334155]/70">
          {email && initial && !collapsed && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#334155]/40">
              <div className="w-7 h-7 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] font-semibold text-xs shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#F8FAFC] text-xs font-medium truncate">{email.split("@")[0]}</p>
                <p className="text-[#64748B] text-[11px] truncate">{email}</p>
              </div>
            </div>
          )}
          <div className="p-2">
            <button
              type="button"
              onClick={handleSignOut}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#64748B] hover:bg-[#1E293B] hover:text-[#EF4444] transition-colors bg-transparent border border-transparent",
                collapsed ? "justify-center" : "",
              ].join(" ")}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut size={17} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
