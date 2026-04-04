"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TeamSummary } from "@/types/employer";

const COLORS = {
  healthy: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
};

export function RiskDistributionChart({ team }: { team: TeamSummary | null }) {
  if (!team || team.total_members === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-border bg-bg-surface p-4">
        <p className="text-sm text-text-tertiary">No team data yet.</p>
      </div>
    );
  }

  const data = [
    { name: "Healthy", value: team.healthy_count, key: "healthy" },
    { name: "Warning", value: team.warning_count, key: "warning" },
    { name: "Critical", value: team.critical_count, key: "critical" },
  ].filter((d) => d.value > 0);

  const total = team.total_members;

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-border bg-bg-surface p-4">
        <p className="text-sm text-text-tertiary">No risk buckets to chart.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-text-tertiary">
        Risk distribution
      </p>
      <div className="mx-auto flex justify-center" style={{ width: 280, height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={COLORS[entry.key as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => {
                const v = typeof value === "number" ? value : Number(value);
                const pct = total ? Math.round((v / total) * 1000) / 10 : 0;
                return [`${v} (${pct}%)`, "Count"];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
