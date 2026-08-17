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
    <div className="flex-1 flex items-center justify-center p-6 bg-[#0F172A] min-h-screen">
      <div className="text-center max-w-md">
        <h2 className="text-[#F8FAFC] font-bold text-2xl mb-2">Something went wrong</h2>
        <p className="text-[#64748B] text-sm leading-relaxed mb-6">
          {error.message || "An unexpected error occurred."}
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
