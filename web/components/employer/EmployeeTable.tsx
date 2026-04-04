"use client";

import type { EmployeeSnapshot, SortKey } from "@/types/employer";
import { EmployeeRow } from "./EmployeeRow";

export function EmployeeTable({
  employees,
  loading,
  onRowClick,
  sortKey,
  order,
  onColumnSort,
}: {
  employees: EmployeeSnapshot[];
  loading: boolean;
  onRowClick: (userId: string) => void;
  sortKey: SortKey;
  order: "asc" | "desc";
  onColumnSort: (k: SortKey) => void;
}) {
  const sortIndicator = (k: SortKey) =>
    sortKey === k ? (order === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-bg-elevated/95 backdrop-blur-sm">
          <tr className="border-b border-border">
            <th className="px-3 py-2">
              <button
                type="button"
                className="text-xs font-mono uppercase tracking-widest text-text-tertiary hover:text-text-secondary"
                onClick={() => onColumnSort("display_name")}
              >
                Name / Email{sortIndicator("display_name")}
              </button>
            </th>
            <th className="px-3 py-2">
              <button
                type="button"
                className="text-xs font-mono uppercase tracking-widest text-text-tertiary hover:text-text-secondary"
                onClick={() => onColumnSort("current_state")}
              >
                State{sortIndicator("current_state")}
              </button>
            </th>
            <th className="px-3 py-2 text-center">
              <button
                type="button"
                className="text-xs font-mono uppercase tracking-widest text-text-tertiary hover:text-text-secondary"
                onClick={() => onColumnSort("risk_score")}
              >
                Risk{sortIndicator("risk_score")}
              </button>
            </th>
            <th className="px-3 py-2">
              <button
                type="button"
                className="text-xs font-mono uppercase tracking-widest text-text-tertiary hover:text-text-secondary"
                onClick={() => onColumnSort("last_activity")}
              >
                Last active{sortIndicator("last_activity")}
              </button>
            </th>
            <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-widest text-text-tertiary">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td colSpan={5} className="px-3 py-4">
                  <div className="animate-pulse rounded bg-bg-elevated h-10 w-full" />
                </td>
              </tr>
            ))}
          {!loading && employees.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-10 text-center text-sm text-text-tertiary"
              >
                No employees match the current filters.
              </td>
            </tr>
          )}
          {!loading &&
            employees.map((e) => (
              <EmployeeRow
                key={e.user_id}
                employee={e}
                onRowClick={onRowClick}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
