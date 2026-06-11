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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-white font-semibold text-2xl mb-3">
          Something went wrong
        </h1>
        <p className="text-slate-400 text-base mb-6">
          Couldn&apos;t load your dashboard. This usually happens after a fresh
          sign-in — try reloading.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 text-base font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
