"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BurnoutPatternBadges } from "@/components/burnout/BurnoutPatternBadges";
import type { EmployeeDetail } from "@/types/employer";
import type { BurnoutState } from "@/types/performance";
import { AccountabilityLog } from "./AccountabilityLog";
import { EmployeeTrendChart } from "./EmployeeTrendChart";
import { StateHistoryTimeline } from "./StateHistoryTimeline";

function stateTone(s: BurnoutState): "complete" | "paused" | "neutral" {
  if (s === "NORMAL") return "complete";
  if (s === "STRAIN") return "paused";
  return "neutral";
}

export function EmployeeDrillDown({
  detail,
  onBack,
}: {
  detail: EmployeeDetail;
  onBack: () => void;
}) {
  const d = detail;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" className="text-xs" onClick={onBack}>
          ← Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-text-primary">
            {d.display_name ?? "Team member"}
          </h1>
          <p className="font-mono text-sm text-text-tertiary">{d.email ?? "—"}</p>
          <div className="mt-2">
            <Badge tone={stateTone(d.current_state)}>{d.current_state}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Risk score
          </p>
          <p className="mt-1 font-mono text-xl text-text-primary">
            {Math.round(d.risk_score)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Workload
          </p>
          <p className="mt-1 font-mono text-xl text-text-primary">
            {Math.round(d.workload_score)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Recovery
          </p>
          <p className="mt-1 font-mono text-xl text-text-primary">
            {Math.round(d.recovery_score)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Consistency
          </p>
          <p className="mt-1 font-mono text-xl text-text-primary">
            {Math.round(d.consistency_score)}
          </p>
        </div>
      </div>

      <EmployeeTrendChart logs={d.snapshots_7d} />
      <StateHistoryTimeline
        transitions={d.state_transitions}
        currentState={d.current_state}
      />
      <AccountabilityLog logs={d.accountability} loading={false} />
      <BurnoutPatternBadges patterns={d.detected_patterns} />
    </div>
  );
}
