"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { EmployeeSnapshot } from "@/types/employer";
import type { BurnoutState } from "@/types/performance";
import { BurnoutGaugeSmall } from "./BurnoutGaugeSmall";

function stateTone(s: BurnoutState): "complete" | "paused" | "neutral" {
  if (s === "NORMAL") return "complete";
  if (s === "STRAIN") return "paused";
  return "neutral";
}

function riskRowClass(score: number): string {
  if (score < 40) return "border-l-4 border-success bg-success/5";
  if (score < 70) return "border-l-4 border-focus-paused bg-focus-paused/5";
  return "border-l-4 border-danger bg-danger/5";
}

export function EmployeeRow({
  employee,
  onRowClick,
}: {
  employee: EmployeeSnapshot;
  onRowClick: (userId: string) => void;
}) {
  const e = employee;
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-bg-elevated",
        riskRowClass(e.risk_score)
      )}
    >
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Avatar label={e.display_name} email={e.email} />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">
              {e.display_name ?? "—"}
            </p>
            <p className="truncate font-mono text-xs text-text-tertiary">
              {e.email ?? "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge tone={stateTone(e.current_state)}>{e.current_state}</Badge>
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-center">
          <BurnoutGaugeSmall score={e.risk_score} level={e.risk_level} />
        </div>
      </td>
      <td className="px-3 py-3 font-mono text-sm text-text-secondary">
        {formatRelativeTime(e.last_activity)}
      </td>
      <td className="px-3 py-3 text-right">
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => onRowClick(e.user_id)}
        >
          View
        </Button>
      </td>
    </tr>
  );
}
