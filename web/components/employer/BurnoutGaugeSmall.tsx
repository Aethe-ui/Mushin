"use client";

import { LEVEL_STROKE } from "@/components/burnout/BurnoutRiskGauge";
import type { RiskLevel } from "@/types/performance";

export function BurnoutGaugeSmall({
  score,
  level,
  size = 64,
}: {
  score: number;
  level: RiskLevel;
  size?: number;
}) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.55;
  const arcLen = Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dashOffset = arcLen * (1 - pct);
  const pathD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;

  return (
    <div
      className="relative flex flex-col items-center justify-end"
      style={{ width: size, height: size * 0.62 }}
    >
      <svg width={size} height={size * 0.52} className="overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke={LEVEL_STROKE[level]}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <p className="-mt-1 font-mono text-sm tabular-nums text-text-primary">
        {Math.round(score)}
      </p>
    </div>
  );
}
