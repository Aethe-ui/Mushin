"use client";

import { Badge } from "@/components/ui/Badge";

const LABELS: Record<string, string> = {
  CONSECUTIVE_HIGH_FOCUS: "High focus streak",
  DECLINING_REST: "Declining rest",
  RISING_WORKLOAD: "Rising workload",
  NO_RECOVERY_DAY: "No recovery day",
  BOOM_BUST: "Boom–bust focus",
};

export function BurnoutPatternBadges({ patterns }: { patterns: string[] }) {
  if (patterns.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Patterns
        </p>
        <p className="mt-2 text-sm text-text-tertiary">
          No elevated multi-day patterns detected in the current window.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
        Detected patterns
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {patterns.map((p) => (
          <Badge key={p} tone="paused">
            {LABELS[p] ?? p}
          </Badge>
        ))}
      </div>
    </div>
  );
}
