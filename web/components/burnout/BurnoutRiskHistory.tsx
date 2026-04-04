"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RiskLevel } from "@/types/performance";

export interface BurnoutRiskHistoryProps {
  scores: {
    date: string;
    risk_score: number;
    risk_level: RiskLevel;
    workload_score?: number;
    recovery_score?: number;
    consistency_score?: number;
  }[];
  events: { date: string; from: string; to: string }[];
}

const LEVEL_COLOR: Record<string, string> = {
  LOW: "#10b981",
  MODERATE: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#7f1d1d",
};

export function BurnoutRiskHistory({
  scores,
  events,
}: BurnoutRiskHistoryProps) {
  const data = scores.map((s) => ({
    ...s,
    short: s.date.slice(5),
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
          14-day risk history
        </p>
        <p className="mt-4 text-sm text-text-tertiary">
          No risk scores in this range yet. Run a performance snapshot or refresh
          risk.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
        14-day risk history
      </p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.35} />
                <stop
                  offset="50%"
                  stopColor="var(--focus-paused)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="var(--success)"
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="short"
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            />
            {[25, 50, 75].map((y) => (
              <ReferenceLine
                key={y}
                y={y}
                stroke="var(--text-tertiary)"
                strokeDasharray="4 4"
                label={{
                  value: String(y),
                  fill: "var(--text-tertiary)",
                  fontSize: 10,
                }}
              />
            ))}
            {events.map((ev, i) => (
              <ReferenceLine
                key={`${ev.date}-${i}`}
                x={ev.date.slice(5)}
                stroke={LEVEL_COLOR[ev.to] ?? "var(--accent)"}
                strokeDasharray="2 2"
              />
            ))}
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
              labelStyle={{ color: "var(--text-secondary)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as {
                  date?: string;
                  risk_score?: number;
                  risk_level?: string;
                  workload_score?: number;
                  recovery_score?: number;
                  consistency_score?: number;
                };
                return (
                  <div className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs shadow-lg">
                    <p className="font-mono text-text-secondary">{label}</p>
                    <p className="mt-1 font-mono text-text-primary">
                      Risk {Math.round(p.risk_score ?? 0)} — {p.risk_level}
                    </p>
                    {p.workload_score != null && (
                      <p className="mt-1 text-text-tertiary">
                        Workload {Math.round(p.workload_score)} · Recovery{" "}
                        {Math.round(p.recovery_score ?? 0)} · Consistency{" "}
                        {Math.round(p.consistency_score ?? 0)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="risk_score"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#riskFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
