"use client";

import { Button } from "@/components/ui/Button";
import type {
  FilterRisk,
  FilterState,
  SortKey,
} from "@/types/employer";

const inputClass =
  "rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function FilterSortBar({
  search,
  onSearch,
  sortKey,
  onSortKeyChange,
  filterState,
  onFilterState,
  filterRisk,
  onFilterRisk,
  order,
  onOrderChange,
}: {
  search: string;
  onSearch: (v: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (k: SortKey) => void;
  filterState: FilterState;
  onFilterState: (f: FilterState) => void;
  filterRisk: FilterRisk;
  onFilterRisk: (f: FilterRisk) => void;
  order: "asc" | "desc";
  onOrderChange: (o: "asc" | "desc") => void;
}) {
  const defaults =
    search === "" &&
    filterState === "ALL" &&
    filterRisk === "ALL" &&
    sortKey === "risk_score" &&
    order === "desc";

  function reset() {
    onSearch("");
    onFilterState("ALL");
    onFilterRisk("ALL");
    onSortKeyChange("risk_score");
    onOrderChange("desc");
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-[160px] flex-1 flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Search
        </span>
        <input
          className={inputClass}
          placeholder="Name or email"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          State
        </span>
        <select
          className={inputClass}
          value={filterState}
          onChange={(e) => onFilterState(e.target.value as FilterState)}
        >
          <option value="ALL">All</option>
          <option value="NORMAL">Normal</option>
          <option value="STRAIN">Strain</option>
          <option value="BURNOUT">Burnout</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Risk
        </span>
        <select
          className={inputClass}
          value={filterRisk}
          onChange={(e) => onFilterRisk(e.target.value as FilterRisk)}
        >
          <option value="ALL">All</option>
          <option value="LOW">Low</option>
          <option value="MODERATE">Moderate</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Sort
        </span>
        <select
          className={inputClass}
          value={sortKey}
          onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
        >
          <option value="risk_score">Risk score</option>
          <option value="last_activity">Last activity</option>
          <option value="display_name">Name</option>
          <option value="current_state">State</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Order
        </span>
        <select
          className={inputClass}
          value={order}
          onChange={(e) => onOrderChange(e.target.value as "asc" | "desc")}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
      {!defaults && (
        <Button variant="ghost" className="text-xs" onClick={reset}>
          Reset
        </Button>
      )}
    </div>
  );
}
