"use client";

import { Badge } from "@/components/ui/Badge";
import type { BurnoutRiskEvent, RiskLevel } from "@/types/performance";

const LEVEL_TONE: Record<
  RiskLevel,
  "neutral" | "complete" | "paused" | "active"
> = {
  LOW: "complete",
  MODERATE: "paused",
  HIGH: "neutral",
  CRITICAL: "neutral",
};

export function BurnoutEscalationTimeline({
  events,
}: {
  events: BurnoutRiskEvent[];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Level changes
        </p>
        <p className="mt-2 text-sm text-text-tertiary">
          No escalations or de-escalations logged in this window.
        </p>
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
        Level changes
      </p>
      <ul className="mt-4 space-y-4">
        {sorted.map((ev) => (
          <li
            key={ev.id}
            className="border-l-2 border-border pl-4 text-sm text-text-secondary"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-text-tertiary">
                {ev.event_date}
              </span>
              <Badge tone={LEVEL_TONE[ev.from_level]}>
                {ev.from_level}
              </Badge>
              <span className="text-text-tertiary">→</span>
              <Badge tone={LEVEL_TONE[ev.to_level]}>{ev.to_level}</Badge>
            </div>
            {ev.trigger_facts.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-text-tertiary">
                {ev.trigger_facts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
