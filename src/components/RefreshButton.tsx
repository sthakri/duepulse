"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

  return (
    <button
      onClick={() => router.refresh()}
      className="text-slate-400 hover:text-white transition-colors bg-transparent"
      title="Refresh"
    >
      <RefreshCw size={16} />
    </button>
  );
}
