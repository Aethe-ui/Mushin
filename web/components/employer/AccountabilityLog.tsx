"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv-export";
import type { AccountabilityEntry } from "@/types/employer";

const PAGE = 20;

function eventPillClass(eventType: string): string {
  if (
    eventType === "BURNOUT_DETECTED" ||
    eventType === "RISK_ESCALATED"
  ) {
    return "bg-danger/10 text-danger";
  }
  if (eventType === "STRAIN_BEGAN") {
    return "bg-focus-paused/10 text-focus-paused";
  }
  if (eventType === "RISK_REDUCED" || eventType === "RECOVERED") {
    return "bg-success/10 text-success";
  }
  return "bg-bg-elevated text-text-secondary";
}

export function AccountabilityLog({
  logs,
  loading,
  onExport,
  showEmployeeColumn = false,
}: {
  logs: AccountabilityEntry[];
  loading: boolean;
  onExport?: () => void;
  showEmployeeColumn?: boolean;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE));
  const slice = useMemo(() => {
    const start = page * PAGE;
    return logs.slice(start, start + PAGE);
  }, [logs, page]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <div className="animate-pulse h-8 w-48 rounded bg-bg-elevated mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-bg-elevated" />
          ))}
        </div>
      </div>
    );
  }

  function handleExport() {
    if (onExport) {
      onExport();
      return;
    }
    downloadCsv(
      logs.map((l) => ({
        date: l.log_date,
        event_type: l.event_type,
        description: l.description,
        metadata: l.metadata,
      })),
      `accountability-log-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Accountability log
        </p>
        <Button variant="ghost" className="text-xs" onClick={handleExport}>
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">
                Date
              </th>
              <th className="px-3 py-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">
                Event
              </th>
              <th className="px-3 py-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">
                Description
              </th>
              {showEmployeeColumn && (
                <th className="px-3 py-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">
                  Employee
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={showEmployeeColumn ? 4 : 3}
                  className="px-3 py-8 text-center text-text-tertiary"
                >
                  No log entries yet.
                </td>
              </tr>
            )}
            {slice.map((l) => (
              <tr
                key={l.id}
                className="border-b border-border hover:bg-bg-elevated transition-colors"
              >
                <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                  {l.log_date}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded px-2 py-0.5 font-mono text-xs",
                      eventPillClass(l.event_type)
                    )}
                  >
                    {l.event_type}
                  </span>
                </td>
                <td className="max-w-md px-3 py-2 text-text-secondary">
                  {l.description}
                </td>
                {showEmployeeColumn && (
                  <td className="px-3 py-2 text-text-secondary">
                    {l.employee_display_name ?? "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length > PAGE && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            className="text-xs"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-text-tertiary">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            className="text-xs"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
