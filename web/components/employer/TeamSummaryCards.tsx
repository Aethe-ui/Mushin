"use client";

import Link from "next/link";
import type { TeamSummary } from "@/types/employer";

export function TeamSummaryCards({ team }: { team: TeamSummary | null }) {
  if (!team) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-border bg-bg-surface p-4 h-24"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Total employees
          </p>
          <p className="mt-1 font-mono text-2xl text-text-primary">
            {team.total_members}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Healthy (0–40)
          </p>
          <p className="mt-1 font-mono text-2xl text-success">
            {team.healthy_count}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Warning (40–70)
          </p>
          <p className="mt-1 font-mono text-2xl text-focus-paused">
            {team.warning_count}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Critical (70+)
          </p>
          <p className="mt-1 font-mono text-2xl text-danger">
            {team.critical_count}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="#employer-alerts"
          className="rounded-lg border border-border bg-bg-surface p-4 transition-colors hover:bg-bg-elevated"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Active alerts
          </p>
          <p className="mt-1 font-mono text-2xl text-text-primary">
            {team.active_alerts}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">View alert feed ↓</p>
        </Link>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Avg risk score
          </p>
          <p className="mt-1 font-mono text-2xl text-text-primary">
            {team.avg_risk_score}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-focus-paused transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, team.avg_risk_score))}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
