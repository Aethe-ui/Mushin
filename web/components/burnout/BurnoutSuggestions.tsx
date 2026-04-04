"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/performance";

export interface BurnoutSuggestionsProps {
  suggestions: string[];
  level: RiskLevel;
}

function iconFor(text: string, level: RiskLevel): string {
  if (level === "CRITICAL" || text.includes("Immediate rest")) return "⛔";
  if (text.includes("sleep") || text.includes("rest")) return "💤";
  if (text.includes("walk") || text.includes("movement")) return "🏃";
  if (text.includes("inconsistent") || text.includes("breaks")) return "🧘";
  return "🧘";
}

export function BurnoutSuggestions({
  suggestions,
  level,
}: BurnoutSuggestionsProps) {
  const dateKey = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const next: Record<number, boolean> = {};
    suggestions.forEach((_, i) => {
      const k = `mushin-burnout-suggestion-${dateKey}-${i}`;
      next[i] = localStorage.getItem(k) === "1";
    });
    setDone(next);
  }, [suggestions, dateKey]);

  function toggle(i: number) {
    const k = `mushin-burnout-suggestion-${dateKey}-${i}`;
    const v = !done[i];
    setDone((d) => ({ ...d, [i]: v }));
    if (v) localStorage.setItem(k, "1");
    else localStorage.removeItem(k);
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Suggestions
        </p>
        <p className="mt-2 text-sm text-text-tertiary">
          No behavioural nudges right now — keep your current rhythm.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
        Suggestions
      </p>
      <ul className="mt-3 space-y-3">
        {suggestions.map((s, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-md border border-border bg-bg-primary/40 p-3"
          >
            <span className="text-lg leading-none" aria-hidden>
              {iconFor(s, level)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-text-secondary">
                {s}
              </p>
              <label
                className={cn(
                  "mt-2 flex cursor-pointer items-center gap-2 font-mono text-xs text-text-tertiary"
                )}
              >
                <input
                  type="checkbox"
                  checked={!!done[i]}
                  onChange={() => toggle(i)}
                  className="rounded border-border"
                />
                Mark as done
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
