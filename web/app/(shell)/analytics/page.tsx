"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionRow } from "@/types/mushin";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/sessions/history?limit=200&offset=0");
      if (!res.ok || cancelled) return;
      const j = await res.json();
      if (cancelled) return;
      setSessions(j.sessions ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const stats = useMemo(() => {
    const recent = sessions.filter(
      (s) => new Date(s.created_at) >= sevenDaysAgo
    );
    const completed = recent.filter((s) => s.status === "completed");
    const abandoned = recent.filter((s) => s.status === "abandoned");
    const totalSec = completed.reduce((a, s) => a + (s.duration ?? 0), 0);
    const avgLen =
      completed.length > 0
        ? Math.round(totalSec / completed.length / 60)
        : 0;
    const completionRate =
      completed.length + abandoned.length > 0
        ? Math.round(
            (100 * completed.length) /
              (completed.length + abandoned.length)
          )
        : 0;

    const byDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      byDay.set(dayKey(d), 0);
    }
    for (const s of completed) {
      const k = dayKey(new Date(s.created_at));
      if (byDay.has(k)) {
        byDay.set(k, (byDay.get(k) ?? 0) + (s.duration ?? 0));
      }
    }
    const chartData = Array.from(byDay.entries()).map(([date, seconds]) => ({
      date: date.slice(5),
      minutes: Math.round(seconds / 60),
    }));

    const daysWithFocus = new Set(
      sessions
        .filter((s) => s.status === "completed")
        .map((s) => dayKey(new Date(s.created_at)))
    );
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      if (daysWithFocus.has(dayKey(d))) streak++;
      else break;
    }

    return {
      totalMinutes: Math.round(totalSec / 60),
      avgLen,
      completionRate,
      chartData,
      streak,
    };
  }, [sessions, sevenDaysAgo]);

  if (loading) {
    return <p className="text-text-tertiary">Loading analytics…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl text-text-primary">Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Last 7 days of completed focus time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Focus minutes (7d)" value={String(stats.totalMinutes)} />
        <Stat label="Avg session (min)" value={String(stats.avgLen)} />
        <Stat label="Completion rate" value={`${stats.completionRate}%`} />
        <Stat label="Streak (days)" value={String(stats.streak)} />
      </div>

      <div className="h-72 rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 text-xs font-mono uppercase text-text-tertiary">
          Weekly trend
        </p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
            <XAxis dataKey="date" stroke="#7a9abf" tick={{ fontSize: 11 }} />
            <YAxis stroke="#7a9abf" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#0f1623",
                border: "1px solid #1e2d42",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#e8f0fe" }}
            />
            <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-1 font-mono text-2xl text-text-primary">{value}</p>
    </div>
  );
}
