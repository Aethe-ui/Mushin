"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BurnoutAnalyticsDashboard } from "@/components/burnout/BurnoutAnalyticsDashboard";
import { levelProgressPercent } from "@/lib/performance";
import type { BurnoutState, PerformanceSnapshot } from "@/types/performance";

type Summary = {
  today: PerformanceSnapshot | null;
  last7Days: PerformanceSnapshot[];
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  streakDays: number;
};

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return fallback;
}

function normalizeSnapshot(raw: PerformanceSnapshot | null): PerformanceSnapshot | null {
  if (!raw) return null;
  return {
    ...raw,
    focus_score: num(raw.focus_score),
    fitness_score: num(raw.fitness_score),
    balance_multiplier: num(raw.balance_multiplier),
    performance_score: num(raw.performance_score),
    xp_earned: num(raw.xp_earned),
  };
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

const BAR_COLORS: Record<string, string> = {
  NORMAL: "#3b82f6",
  STRAIN: "#f59e0b",
  BURNOUT: "#ef4444",
};

export default function PerformancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [workoutMin, setWorkoutMin] = useState(0);
  const [intensity, setIntensity] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [restHours, setRestHours] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  const refreshSummary = useCallback(async () => {
    const res = await fetch("/api/performance?days=7");
    if (!res.ok) return null;
    const data = (await res.json()) as Summary;
    return {
      ...data,
      today: normalizeSnapshot(data.today),
      last7Days: (data.last7Days ?? []).map(
        (s) => normalizeSnapshot(s)!
      ),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/performance?days=7");
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as Summary;
        let next: Summary = {
          ...data,
          today: normalizeSnapshot(data.today),
          last7Days: (data.last7Days ?? []).map(
            (s) => normalizeSnapshot(s)!
          ),
        };
        if (!data.today) {
          await fetch("/api/performance/snapshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const r2 = await fetch("/api/performance?days=7");
          if (r2.ok && !cancelled) {
            const d2 = (await r2.json()) as Summary;
            next = {
              ...d2,
              today: normalizeSnapshot(d2.today),
              last7Days: (d2.last7Days ?? []).map(
                (s) => normalizeSnapshot(s)!
              ),
            };
          }
        }
        if (!cancelled) setSummary(next);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function afterLogRefresh() {
    setSubmitting(true);
    try {
      await fetch("/api/performance/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const s = await refreshSummary();
      if (s) setSummary(s);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWorkout(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/performance/log/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayStr,
        duration_min: workoutMin,
        intensity,
      }),
    });
    if (res.ok) await afterLogRefresh();
  }

  async function submitRest(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/performance/log/rest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayStr, hours: restHours }),
    });
    if (res.ok) await afterLogRefresh();
  }

  const today = summary?.today ?? null;
  const burnoutState = (today?.burnout_state ?? "NORMAL") as BurnoutState;
  const perfScore = num(today?.performance_score);
  const focusScore = num(today?.focus_score);
  const fitnessScore = num(today?.fitness_score);
  const balanceMult = num(today?.balance_multiplier, 1);
  const explanation = today?.explanation ?? "";
  const totalXP = summary?.totalXP ?? 0;
  const level = summary?.level ?? 1;
  const xpToNext = summary?.xpToNextLevel ?? 0;
  const xpBarPct = levelProgressPercent(totalXP);

  const perfColor =
    burnoutState === "BURNOUT"
      ? "text-danger"
      : burnoutState === "STRAIN"
        ? "text-focus-paused"
        : "text-accent";

  const balanceColor =
    balanceMult >= 1.1
      ? "text-success"
      : balanceMult < 0.8
        ? "text-danger"
        : "text-focus-paused";

  const chartData = useMemo(() => {
    const rows = [...(summary?.last7Days ?? [])].reverse();
    return rows.map((s) => ({
      date: s.snapshot_date.slice(5),
      score: num(s.performance_score),
      state: s.burnout_state,
    }));
  }, [summary?.last7Days]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 rounded bg-bg-surface" />
        <div className="h-24 rounded-lg bg-bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl text-text-primary">Performance</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Focus · Fitness · Recovery — unified score.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-lg text-white"
            aria-hidden
          >
            {level}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm text-text-secondary">
              Level {level}
              {xpToNext > 0 ? (
                <span className="text-text-tertiary">
                  {" "}
                  · {xpToNext} XP to next
                </span>
              ) : null}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-bg-elevated">
              <div
                className="h-2 rounded-full bg-accent transition-all"
                style={{ width: `${xpBarPct}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-text-tertiary">
              {totalXP} total XP
              {summary && summary.streakDays > 0 ? (
                <span className="text-text-secondary">
                  {" "}
                  · {summary.streakDays}-day streak
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {burnoutState !== "NORMAL" && (
        <div
          className={cn(
            "rounded-lg border p-4",
            burnoutState === "BURNOUT" &&
              "border-danger bg-danger/10",
            burnoutState === "STRAIN" &&
              "border-focus-paused bg-focus-paused/10"
          )}
        >
          <p className="font-mono text-sm text-text-primary">
            {burnoutState === "BURNOUT"
              ? "⚠️ Burnout Detected"
              : "⚡ Strain Detected"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {firstSentence(explanation)}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-xs text-text-tertiary">Performance score</p>
          <p className={cn("mt-1 font-mono text-2xl", perfColor)}>
            {today ? perfScore : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-xs text-text-tertiary">Focus score</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">
            {today ? `${focusScore}/100` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-xs text-text-tertiary">Fitness score</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">
            {today ? `${fitnessScore}/100` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-xs text-text-tertiary">Balance multiplier</p>
          <p className={cn("mt-1 font-mono text-2xl", balanceColor)}>
            {today ? `${balanceMult.toFixed(2)}×` : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Today&apos;s breakdown
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          {today ? explanation : "No snapshot for today yet."}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
            Log today
          </p>
          <Button
            variant="ghost"
            className="text-xs"
            type="button"
            onClick={() => setLogOpen((o) => !o)}
          >
            {logOpen ? "Hide" : "Show"}
          </Button>
        </div>
        {logOpen && (
          <div className="mt-4 space-y-6">
            <form onSubmit={(e) => void submitWorkout(e)} className="space-y-3">
              <p className="font-mono text-sm text-text-primary">Workout</p>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-text-tertiary">Duration</span>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={workoutMin}
                  onChange={(e) => setWorkoutMin(Number(e.target.value))}
                  className="w-24 rounded-md border border-border bg-bg-primary px-2 py-1 font-mono text-text-primary"
                />
                <span>min</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(["low", "medium", "high"] as const).map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={intensity === k ? "primary" : "ghost"}
                    className="text-xs capitalize"
                    onClick={() => setIntensity(k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>
              <Button
                type="submit"
                className="text-xs"
                disabled={submitting}
              >
                Save workout
              </Button>
            </form>
            <form onSubmit={(e) => void submitRest(e)} className="space-y-3">
              <p className="font-mono text-sm text-text-primary">
                Sleep last night
              </p>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-text-tertiary">Hours</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={restHours}
                  onChange={(e) => setRestHours(Number(e.target.value))}
                  className="w-24 rounded-md border border-border bg-bg-primary px-2 py-1 font-mono text-text-primary"
                />
                <span>h</span>
              </label>
              <p className="text-xs text-text-tertiary">Optimal: 7–9h</p>
              <Button type="submit" className="text-xs" disabled={submitting}>
                Save rest
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="h-72 rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Weekly scores
        </p>
        {chartData.length === 0 ? (
          <p className="text-sm text-text-tertiary">No snapshot history yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
              <XAxis
                dataKey="date"
                stroke="#7a9abf"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[0, 120]}
                stroke="#7a9abf"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f1623",
                  border: "1px solid #1e2d42",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#e8f0fe" }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={BAR_COLORS[entry.state] ?? BAR_COLORS.NORMAL}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          XP history
        </p>
        <ul className="space-y-2">
          {(summary?.last7Days ?? []).map((snap) => (
            <li
              key={snap.id}
              className="flex items-center justify-between rounded-md border border-border bg-bg-primary px-3 py-2"
            >
              <span className="font-mono text-sm text-text-secondary">
                {snap.snapshot_date}
              </span>
              <div className="flex items-center gap-3">
                <Badge tone={stateTone(snap.burnout_state)}>
                  {snap.burnout_state}
                </Badge>
                <span className="font-mono text-sm text-text-primary">
                  +{num(snap.xp_earned)} XP
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Burnout Analytics — Last 5 Days
        </h2>
        <BurnoutAnalyticsDashboard />
      </section>
    </div>
  );
}
