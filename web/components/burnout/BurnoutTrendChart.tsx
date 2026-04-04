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
  ReferenceLine,
  ReferenceArea,
} from "recharts";

type DayLog = {
  date: string;
  workout_minutes: number;
  rest_minutes: number;
  focus_score: number | null;
  burnout_state: string | null;
};

type TransitionMarker = { date: string; from: string; to: string };

const STATE_COLORS: Record<string, string> = {
  NORMAL: "#10b981",
  STRAIN: "#f59e0b",
  BURNOUT: "#ef4444",
};

export function BurnoutTrendChart({
  logs,
  transitionMarkers,
}: {
  logs: DayLog[];
  transitionMarkers: TransitionMarker[];
}) {
  const chartData = logs.map((l) => ({
    date: l.date.slice(5),
    fullDate: l.date,
    focus: l.workout_minutes,
    rest: l.rest_minutes,
    focusScore: l.focus_score ?? 0,
    imbalance:
      l.workout_minutes > 2 * l.rest_minutes && l.rest_minutes > 0,
  }));

  const imbalanceRanges: { start: string; end: string }[] = [];
  let inZone = false;
  let zoneStart = "";
  for (const d of chartData) {
    if (d.imbalance && !inZone) {
      inZone = true;
      zoneStart = d.date;
    } else if (!d.imbalance && inZone) {
      imbalanceRanges.push({ start: zoneStart, end: d.date });
      inZone = false;
    }
  }
  if (inZone && zoneStart) {
    imbalanceRanges.push({
      start: zoneStart,
      end: chartData[chartData.length - 1]?.date ?? zoneStart,
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Focus vs Rest — Last 5 Days
        </p>
        {imbalanceRanges.length > 0 && (
          <span className="rounded bg-danger/10 px-2 py-0.5 font-mono text-xs text-danger">
            ⚠ Imbalance detected
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-tertiary)"
            tick={{
              fontSize: 11,
              fill: "var(--text-secondary)",
            }}
          />
          <YAxis
            stroke="var(--text-tertiary)"
            tick={{
              fontSize: 11,
              fill: "var(--text-secondary)",
            }}
            unit="m"
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{
              color: "var(--text-primary)",
              fontFamily: "monospace",
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              const label = String(name);
              return [
                `${Number.isFinite(n) ? n : 0}min`,
                label === "focus" ? "Workout/Focus" : "Rest",
              ];
            }}
          />
          <Legend
            formatter={(value) => (
              <span
                style={{ color: "var(--text-secondary)", fontSize: 12 }}
              >
                {value === "focus" ? "🏋 Workout/Focus" : "💤 Rest"}
              </span>
            )}
          />

          {imbalanceRanges.map((range, i) => (
            <ReferenceArea
              key={i}
              x1={range.start}
              x2={range.end}
              fill="var(--danger)"
              fillOpacity={0.07}
              strokeOpacity={0}
            />
          ))}

          {transitionMarkers.map((m, i) => (
            <ReferenceLine
              key={i}
              x={m.date.slice(5)}
              stroke={STATE_COLORS[m.to] ?? "var(--text-tertiary)"}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: `→${m.to}`,
                position: "top",
                fontSize: 9,
                fill: STATE_COLORS[m.to] ?? "var(--text-tertiary)",
                fontFamily: "monospace",
              }}
            />
          ))}

          <Line
            type="monotone"
            dataKey="focus"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            name="focus"
          />
          <Line
            type="monotone"
            dataKey="rest"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            name="rest"
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-text-tertiary">
        <span className="mr-1 inline-block h-2 w-4 rounded bg-danger opacity-40" />
        Red zone = workout &gt; 2× rest (overload risk)
      </p>
    </div>
  );
}
