"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#0F172A]">
      <div className="text-center max-w-md">
        <h1 className="text-[#F8FAFC] font-bold text-2xl mb-3">Something went wrong</h1>
        <p className="text-[#94A3B8] text-base mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white px-6 py-3 text-base font-semibold transition-colors shadow-[0_8px_25px_rgba(99,102,241,0.25)]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
