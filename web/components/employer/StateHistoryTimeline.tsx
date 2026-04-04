"use client";

import { cn } from "@/lib/utils";
import type { BurnoutState } from "@/types/performance";
import type { StateTransition } from "@/types/employer";

const RISK_EMOJI: Record<string, string> = {
  LOW: "🟢",
  MODERATE: "🟡",
  HIGH: "🟠",
  CRITICAL: "🔴",
};

const RISK_COLOR: Record<string, string> = {
  LOW: "var(--success)",
  MODERATE: "var(--focus-paused)",
  HIGH: "var(--danger)",
  CRITICAL: "#7f1d1d",
};

function daysBetween(a: string, b: string): number {
  const t0 = new Date(a + "T12:00:00.000Z").getTime();
  const t1 = new Date(b + "T12:00:00.000Z").getTime();
  return Math.max(0, Math.round((t1 - t0) / 86400000));
}

export function StateHistoryTimeline({
  transitions,
  currentState,
}: {
  transitions: StateTransition[];
  currentState: BurnoutState;
}) {
  const sorted = [...transitions].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Risk transition history
        </p>
        <p className="text-sm text-text-tertiary">
          No state changes recorded.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-text-tertiary">
        Risk transition timeline
      </p>
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {sorted.map((t, i) => {
          const next = sorted[i + 1];
          const durationDays = next
            ? daysBetween(t.date, next.date)
            : daysBetween(t.date, today);
          const isLast = i === sorted.length - 1;
          const color = RISK_COLOR[t.to_state] ?? "var(--text-tertiary)";
          const emoji = RISK_EMOJI[t.to_state] ?? "⚪";

          return (
            <div key={`${t.date}-${i}`} className="flex items-start">
              <div className="flex flex-col items-center gap-1.5 px-1">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm shadow-md",
                    isLast && "animate-pulse"
                  )}
                  style={{
                    backgroundColor: color,
                    color: "#fff",
                    boxShadow: `0 0 10px ${color}55`,
                  }}
                  title={`${t.date}: ${t.from_state} → ${t.to_state}`}
                >
                  {emoji}
                </span>
                <span className="text-center font-mono text-[10px] text-text-tertiary">
                  {t.date.slice(5)}
                </span>
                <span
                  className="text-center font-mono text-[9px] font-semibold uppercase"
                  style={{ color }}
                >
                  {t.to_state}
                </span>
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">
                  {durationDays} day{durationDays === 1 ? "" : "s"}
                </span>
              </div>
              {i < sorted.length - 1 && (
                <div className="mx-0.5 flex shrink-0 items-center pt-4">
                  <div className="h-px w-5 bg-border" />
                  <span className="text-xs text-text-tertiary">›</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-text-tertiary">
        Current performance state:{" "}
        <span className="font-mono text-text-secondary">{currentState}</span>
      </p>
    </div>
  );
}
