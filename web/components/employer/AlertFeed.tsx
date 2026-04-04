"use client";

import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";
import type { EmployerAlert } from "@/types/employer";
import { AlertBadge } from "./AlertBadge";

export function AlertFeed({
  alerts,
  onResolve,
  loading,
}: {
  alerts: EmployerAlert[];
  onResolve: (alertId: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-bg-surface p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded border border-border bg-bg-elevated h-20"
          />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div
        id="employer-alerts"
        className="rounded-lg border border-border bg-bg-surface p-6 text-center text-sm text-success"
      >
        ✓ No active alerts.
      </div>
    );
  }

  return (
    <div
      id="employer-alerts"
      className="space-y-3 rounded-lg border border-border bg-bg-surface p-4"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
        Active alerts
      </p>
      <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`rounded-md border border-border bg-bg-primary/40 p-3 pl-4 ${
              a.alert_type === "CRITICAL"
                ? "border-l-4 border-l-danger"
                : "border-l-4 border-l-focus-paused"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <AlertBadge type={a.alert_type} />
              <span className="text-sm font-medium text-text-primary">
                {a.display_name ?? "Team member"}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
              {a.message}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-text-tertiary">
                {formatRelativeTime(a.created_at)}
              </span>
              <Button
                variant="ghost"
                className="text-xs px-2 py-1"
                onClick={() => onResolve(a.id)}
              >
                Resolve
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
