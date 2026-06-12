"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Settings } from "lucide-react";

interface Props {
  email: string;
  memberSince: string;
  initial: string;
}

export default function UserMenu({ email, memberSince, initial }: Props) {
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


  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center text-[#D6B36A] font-semibold text-sm hover:bg-[#D6B36A]/25 transition-colors"
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
            className="w-56 rounded-[18px] bg-[#151C2B] border border-[#2A3444] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#2A3444]">
              <p className="text-[#F6F1E8] text-sm font-medium truncate">
                {email}
              </p>
              <p className="text-[#7E8AA0] text-xs mt-0.5">
                Member since {memberSince}
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[#AAB4C4] hover:text-[#F6F1E8] hover:bg-[#1C2637] text-sm transition-colors"
            >
              <Settings size={14} />
              Settings
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
