"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  memberSince: string;
  initial: string;
}

export default function UserMenu({ email, memberSince, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/");
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-sm hover:bg-indigo-500/30 transition-colors"
        aria-label="User menu"
      >
        {initial}
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: position.top,
              right: position.right,
              zIndex: 9999,
            }}
            className="w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-700">
              <p className="text-white text-sm font-medium truncate">
                {email}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                Member since {memberSince}
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/60 text-sm transition-colors"
            >
              <Settings size={14} />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/60 text-sm transition-colors bg-transparent"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
