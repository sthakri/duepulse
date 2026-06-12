"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  initial: string;
}

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BookOpen, label: "Assignments", href: "/dashboard/assignments" },
  { icon: BarChart2, label: "Insights", href: "/dashboard/insights" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardSidebar({ email, initial }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("dp-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("dp-sidebar-collapsed", String(next));
    } catch {
      /* ignore */
    }
  }

  async function signOut() {
    await createClient().auth.signOut({ scope: "global" });
    router.push("/");
  }

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  }

  // ── Shared nav items ────────────────────────────────────────────────────────
  function NavItems({ forceExpanded = false }: { forceExpanded?: boolean }) {
    const compact = collapsed && !forceExpanded;
    return (
      <>
        {NAV.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={compact ? label : undefined}
              className={[
                "flex items-center rounded-xl text-sm font-medium transition-all duration-150",
                compact
                  ? "w-10 h-10 justify-center mx-auto"
                  : "gap-3 px-3 py-2.5 w-full",
                active
                  ? "bg-[#D6B36A]/12 text-[#D6B36A] border border-[#D6B36A]/20"
                  : "text-[#7E8AA0] hover:text-[#AAB4C4] hover:bg-[#1C2637] border border-transparent",
              ].join(" ")}
            >
              <Icon
                size={17}
                className={`shrink-0 ${active ? "text-[#D6B36A]" : ""}`}
              />
              {!compact && <span>{label}</span>}
            </Link>
          );
        })}
      </>
    );
  }

  // ── Profile row (bottom of sidebar) ────────────────────────────────────────
  function ProfileRow({
    compact,
    clickable,
  }: {
    compact: boolean;
    clickable: boolean;
  }) {
    const inner = (
      <>
        <div className="w-8 h-8 rounded-full bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center text-[#D6B36A] font-semibold text-sm shrink-0">
          {initial}
        </div>
        {!compact && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[#F6F1E8] text-xs font-medium truncate">
                {email.split("@")[0]}
              </p>
              <p className="text-[#7E8AA0] text-[11px] truncate">{email}</p>
            </div>
            {clickable && (
              <ChevronLeft
                size={14}
                className={`text-[#7E8AA0] shrink-0 transition-transform duration-300 ${
                  collapsed ? "rotate-180" : ""
                }`}
              />
            )}
          </>
        )}
      </>
    );

    if (clickable) {
      return (
        <button
          type="button"
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={[
            "w-full flex items-center border-b border-[#2A3444]/40 py-3.5",
            "hover:bg-[#1C2637] transition-colors bg-transparent",
            compact ? "justify-center px-3" : "gap-3 px-4",
          ].join(" ")}
        >
          {inner}
        </button>
      );
    }

    return (
      <div
        className={[
          "flex items-center border-b border-[#2A3444]/40 py-3.5",
          "gap-3 px-4",
        ].join(" ")}
      >
        {inner}
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={[
          "hidden lg:flex flex-col shrink-0 border-r border-[#2A3444] bg-[#0E1320]",
          "min-h-screen sticky top-0 h-screen overflow-hidden",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-56",
        ].join(" ")}
      >
        {/* Logo */}
        <div
          className={[
            "border-b border-[#2A3444] flex items-center h-[57px]",
            collapsed ? "justify-center px-3" : "px-5",
          ].join(" ")}
        >
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center shrink-0">
              <Zap size={14} className="text-[#D6B36A]" fill="#D6B36A" />
            </div>
            {!collapsed && (
              <span className="font-bold text-[#F6F1E8] tracking-tight whitespace-nowrap overflow-hidden">
                DuePulse
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav
          className={[
            "flex-1 py-4 space-y-1",
            collapsed ? "px-2" : "px-3",
          ].join(" ")}
        >
          <NavItems />
        </nav>

        {/* Bottom: profile + sign out */}
        <div className="border-t border-[#2A3444]">
          <ProfileRow compact={collapsed} clickable />
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className={[
              "w-full flex items-center text-[#7E8AA0] hover:text-[#C97064]",
              "hover:bg-[#C97064]/8 transition-colors py-3 bg-transparent",
              collapsed ? "justify-center px-3" : "gap-3 px-4",
            ].join(" ")}
          >
            <LogOut size={15} className="shrink-0" />
            {!collapsed && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile: hamburger button ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 w-9 h-9 rounded-xl border border-[#2A3444] bg-[#151C2B] flex items-center justify-center text-[#7E8AA0] hover:text-[#AAB4C4] transition-colors shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile: drawer ───────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0E1320] border-r border-[#2A3444] flex flex-col animate-in slide-in-from-left duration-200 ease-out">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-[57px] border-b border-[#2A3444]">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <div className="w-7 h-7 rounded-lg bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center">
                  <Zap size={14} className="text-[#D6B36A]" fill="#D6B36A" />
                </div>
                <span className="font-bold text-[#F6F1E8] tracking-tight">
                  DuePulse
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-xl border border-[#2A3444] bg-[#1C2637] flex items-center justify-center text-[#7E8AA0] hover:text-[#AAB4C4] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              <NavItems forceExpanded />
            </nav>

            {/* Profile + sign out */}
            <div className="border-t border-[#2A3444]">
              <ProfileRow compact={false} clickable={false} />
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-[#7E8AA0] hover:text-[#C97064] hover:bg-[#C97064]/8 transition-colors bg-transparent"
              >
                <LogOut size={15} className="shrink-0" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
