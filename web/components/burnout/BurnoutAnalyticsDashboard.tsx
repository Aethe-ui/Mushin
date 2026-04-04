"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BurnoutStateIndicator } from "./BurnoutStateIndicator";
import { BurnoutTrendChart } from "./BurnoutTrendChart";
import { BurnoutTransitionTimeline } from "./BurnoutTransitionTimeline";
import { BurnoutPatternInsights } from "./BurnoutPatternInsights";
import { Button } from "@/components/ui/Button";
import type { BurnoutState } from "@/types/performance";

type DayLog = {
  date: string;
  focus_score: number | null;
  fitness_score: number | null;
  performance_score: number | null;
  burnout_state: string | null;
  workout_minutes: number;
  rest_minutes: number;
  rest_hours: number;
  has_data: boolean;
};

type TransitionMarker = { date: string; from: string; to: string };

type AnalyticsData = {
  logs: DayLog[];
  patterns: string[];
  transitions: (string | null)[];
  transitionMarkers: TransitionMarker[];
  dateRange: { from: string; to: string };
};

function LogForm({ onSaved }: { onSaved: () => void }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [workoutMin, setWorkoutMin] = useState(0);
  const [intensity, setIntensity] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [restHours, setRestHours] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveWorkout(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const res = await fetch("/api/performance/log/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayStr,
        duration_min: workoutMin,
        intensity,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setMessage("✓ Workout saved");
      await fetch("/api/performance/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage(`✕ ${(d as { error?: string }).error ?? "Failed to save"}`);
    }
  }

  async function saveRest(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const res = await fetch("/api/performance/log/rest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayStr, hours: restHours }),
    });
    setSubmitting(false);
    if (res.ok) {
      setMessage("✓ Rest saved");
      await fetch("/api/performance/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage(`✕ ${(d as { error?: string }).error ?? "Failed to save"}`);
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
        Log Today
      </p>

      <form onSubmit={(e) => void saveWorkout(e)} className="space-y-3">
        <p className="font-mono text-sm text-text-primary">🏋 Workout</p>
        <label className="flex items-center gap-3 text-sm text-text-secondary">
          <span className="w-20 text-xs text-text-tertiary">Duration</span>
          <input
            type="number"
            min={0}
            max={300}
            value={workoutMin}
            onChange={(e) => setWorkoutMin(Number(e.target.value))}
            className="w-24 rounded-md border border-border bg-bg-primary px-2 py-1 font-mono text-sm text-text-primary focus:border-border-active focus:outline-none"
          />
          <span className="text-xs text-text-tertiary">min</span>
        </label>
        <div className="flex gap-2">
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
          disabled={submitting || workoutMin < 1}
        >
          Save Workout
        </Button>
      </form>

      <form onSubmit={(e) => void saveRest(e)} className="space-y-3">
        <p className="font-mono text-sm text-text-primary">💤 Rest / Sleep</p>
        <label className="flex items-center gap-3 text-sm text-text-secondary">
          <span className="w-20 text-xs text-text-tertiary">Hours</span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={restHours}
            onChange={(e) => setRestHours(Number(e.target.value))}
            className="w-24 rounded-md border border-border bg-bg-primary px-2 py-1 font-mono text-sm text-text-primary focus:border-border-active focus:outline-none"
          />
          <span className="text-xs text-text-tertiary">h (optimal: 7–9)</span>
        </label>
        <Button type="submit" className="text-xs" disabled={submitting}>
          Save Rest
        </Button>
      </form>

      {message && (
        <p
          className={`font-mono text-xs ${message.startsWith("✓") ? "text-success" : "text-danger"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function CurrentStatePanel({ logs }: { logs: DayLog[] }) {
  const today = logs[logs.length - 1];
  if (!today?.has_data) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Current State
        </p>
        <p className="text-sm text-text-tertiary">
          No snapshot for today yet. Log workout and rest above.
        </p>
      </div>
    );
  }

  const workoutPct = Math.min(100, Math.round((today.workout_minutes / 120) * 100));
  const restPct = Math.min(100, Math.round((today.rest_hours / 9) * 100));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
        Current State
      </p>
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-text-tertiary">
            <span>Workout</span>
            <span>{today.workout_minutes}min</span>
          </div>
          <div className="h-2 rounded-full bg-bg-elevated">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${workoutPct}%`,
                backgroundColor: "#f97316",
              }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-text-tertiary">
            <span>Rest</span>
            <span>{today.rest_hours}h</span>
          </div>
          <div className="h-2 rounded-full bg-bg-elevated">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${restPct}%`,
                backgroundColor: "#38bdf8",
              }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-text-secondary">
        {today.workout_minutes > 2 * today.rest_minutes
          ? `⚠ Workout (${today.workout_minutes}min) exceeds 2× rest (${today.rest_minutes}min). Recovery imbalance.`
          : `✓ Workout and rest are balanced today.`}
      </p>
    </div>
  );
}

export function BurnoutAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/performance/analytics");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      setData((await res.json()) as AnalyticsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 rounded-lg bg-bg-surface" />
        <div className="h-72 rounded-lg bg-bg-surface" />
        <div className="h-24 rounded-lg bg-bg-surface" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
        <p className="font-mono text-sm text-danger">
          Failed to load analytics: {error}
        </p>
        <Button
          variant="ghost"
          className="mt-3 text-xs"
          onClick={() => void fetchAnalytics()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const today = data!.logs[data!.logs.length - 1];
  const currentState = (today?.burnout_state ?? "NORMAL") as BurnoutState;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-center rounded-lg border border-border bg-bg-surface p-6">
          <BurnoutStateIndicator state={currentState} />
        </div>
        <CurrentStatePanel logs={data!.logs} />
      </div>

      <LogForm onSaved={() => void fetchAnalytics()} />

      <BurnoutTrendChart
        logs={data!.logs}
        transitionMarkers={data!.transitionMarkers}
      />

      <BurnoutTransitionTimeline
        transitions={data!.logs.map((l) => l.burnout_state)}
        dates={data!.logs.map((l) => l.date)}
      />

      <BurnoutPatternInsights patterns={data!.patterns} />
    </div>
  );
}
