"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        setSpinning(true);
        router.refresh();
        setTimeout(() => setSpinning(false), 1000);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

  const handleClick = useCallback(() => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 1000);
  }, [router]);

  return (
    <button
      onClick={handleClick}
      className="text-slate-400 hover:text-white transition-colors bg-transparent"
      title="Refresh"
    >
      <RefreshCw
        size={16}
        className={spinning ? "animate-spin" : ""}
      />
    </button>
  );
}
