"use client";

export interface BurnoutSubScoreBreakdownProps {
  workloadScore: number;
  recoveryScore: number;
  consistencyScore: number;
}

function barColor(v: number): string {
  if (v < 33) return "var(--success)";
  if (v <= 66) return "var(--focus-paused)";
  return "var(--danger)";
}

function BarRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div title={hint} className="cursor-help">
      <div className="mb-1 flex justify-between font-mono text-xs text-text-secondary">
        <span>{label}</span>
        <span className="tabular-nums text-text-primary">
          {Math.round(v)}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${v}%`,
            backgroundColor: barColor(v),
          }}
        />
      </div>
    </div>
  );
}

export function BurnoutSubScoreBreakdown({
  workloadScore,
  recoveryScore,
  consistencyScore,
}: BurnoutSubScoreBreakdownProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-surface p-4">
      <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
        Risk drivers
      </p>
      <BarRow
        label="Workload pressure"
        value={workloadScore}
        hint="Focus + workout load vs sustainable daily ceiling (higher = more risk)."
      />
      <BarRow
        label="Recovery pressure"
        value={recoveryScore}
        hint="Inverse of rest adequacy vs ~9h target (higher = more risk)."
      />
      <BarRow
        label="Consistency / variance"
        value={consistencyScore}
        hint="Performance score volatility (higher variance = more risk)."
      />
    </div>
  );
}
