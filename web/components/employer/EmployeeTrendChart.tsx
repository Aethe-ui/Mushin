"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyEmployeeLog } from "@/types/employer";

export function EmployeeTrendChart({
  logs,
  title = "Performance & recovery",
}: {
  logs: DailyEmployeeLog[];
  title?: string;
}) {
  const chartData = logs.map((l) => ({
    date: l.date.slice(5),
    fullDate: l.date,
    focus_score: l.focus_score ?? 0,
    performance_score: l.performance_score ?? 0,
    rest_scaled: l.rest_hours * 15,
    workout_minutes: l.workout_minutes,
  }));

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-tertiary">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-tertiary)"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            stroke="var(--text-tertiary)"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 180]}
            stroke="var(--text-tertiary)"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              const label = String(name);
              if (label === "rest_scaled") {
                const row = chartData.find((d) => d.rest_scaled === n);
                const h = row ? row.rest_scaled / 15 : 0;
                return [`${h.toFixed(1)}h rest`, "Rest"];
              }
              return [Number.isFinite(n) ? n : 0, label];
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as { fullDate?: string } | undefined;
              return p?.fullDate ?? "";
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {value === "focus_score"
                  ? "Focus score"
                  : value === "performance_score"
                    ? "Performance"
                    : value === "rest_scaled"
                      ? "Rest (h×15)"
                      : "Workout min"}
              </span>
            )}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="focus_score"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            name="focus_score"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="performance_score"
            stroke="var(--focus-complete)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--focus-complete)" }}
            name="performance_score"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rest_scaled"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ r: 3, fill: "#38bdf8" }}
            name="rest_scaled"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="workout_minutes"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f97316" }}
            name="workout_minutes"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-text-tertiary">
        Left axis: scores 0–100. Right axis: workout minutes and rest hours
        scaled (hours × 15, max 12h → 180).
      </p>
    </div>
  );
}
