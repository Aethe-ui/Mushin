"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { BurnoutState, PerformanceSnapshot } from "@/types/performance";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return fallback;
}

function stateTone(
  state: string
): "complete" | "paused" | "neutral" {
  if (state === "NORMAL") return "complete";
  if (state === "STRAIN") return "paused";
  return "neutral";
}

function firstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const idx = text.indexOf(". ");
  if (idx === -1) return text;
  return text.slice(0, idx + 1);
}

type Summary = {
  today: PerformanceSnapshot | null;
  totalXP: number;
  level: number;
  xpToNextLevel: number;
};

export function PerformanceWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/performance?days=1");
      if (cancelled) return;
      if (res.ok) {
        setLoadError(false);
        setSummary(await res.json());
      } else {
        setLoadError(true);
        setSummary(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <div className="h-6 w-40 animate-pulse rounded bg-bg-elevated" />
        <div className="mt-3 h-10 w-24 animate-pulse rounded bg-bg-elevated" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-bg-elevated" />
      </div>
    );
  }

  const today = summary?.today;
  if (!today) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        {loadError ? (
          <p className="text-sm text-text-secondary">
            Couldn&apos;t load performance.
          </p>
        ) : (
          <Link
            href="/performance"
            className="text-sm text-accent hover:text-accent-hover"
          >
            Log today&apos;s data →
          </Link>
        )}
      </div>
    );
  }

  const burnoutState = today.burnout_state as BurnoutState;
  const perfScore = num(today.performance_score);
  const xpToday = num(today.xp_earned);
  const scoreColor =
    burnoutState === "BURNOUT"
      ? "text-danger"
      : burnoutState === "STRAIN"
        ? "text-focus-paused"
        : "text-accent";

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-text-tertiary">Today</p>
          <p className={cn("mt-1 font-mono text-3xl", scoreColor)}>
            {perfScore}
          </p>
          <p className="mt-1 font-mono text-xs text-text-secondary">
            +{xpToday} XP · Level {summary?.level ?? 1}
          </p>
        </div>
        <Badge tone={stateTone(burnoutState)}>{burnoutState}</Badge>
      </div>
      {today.explanation ? (
        <p className="mt-3 text-sm text-text-secondary">
          {firstSentence(today.explanation)}
        </p>
      ) : null}
      <Link
        href="/performance"
        className="mt-3 inline-block text-xs text-accent hover:text-accent-hover"
      >
        Open performance →
      </Link>
    </div>
  );
}
