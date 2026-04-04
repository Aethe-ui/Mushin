"use client";

import { cn } from "@/lib/utils";

export function AlertBadge({
  type,
}: {
  type: "WARNING" | "CRITICAL";
}) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 font-mono text-xs uppercase tracking-wide",
        type === "CRITICAL" && "bg-danger/15 text-danger",
        type === "WARNING" && "bg-focus-paused/15 text-focus-paused"
      )}
    >
      {type}
    </span>
  );
}
