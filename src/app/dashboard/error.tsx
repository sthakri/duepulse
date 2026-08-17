"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#243044] border border-[#334155] flex items-center justify-center mb-5 mx-auto">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-[#F8FAFC] font-bold text-xl mb-2">Something went wrong</h2>
        <p className="text-[#64748B] text-sm leading-relaxed mb-6">
          {error.message || "An unexpected error occurred. Try refreshing the page."}
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold text-sm px-5 py-2.5 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
