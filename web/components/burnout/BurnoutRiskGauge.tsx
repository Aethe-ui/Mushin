"use client";

import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/performance";

const LEVEL_STROKE: Record<RiskLevel, string> = {
  LOW: "#10b981",
  MODERATE: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#7f1d1d",
};

export interface BurnoutRiskGaugeProps {
  score: number;
  level: RiskLevel;
  label?: string;
  size?: number;
}

export function BurnoutRiskGauge({
  score,
  level,
  label = "Risk score",
  size = 200,
}: BurnoutRiskGaugeProps) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.55;
  const arcLen = Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dashOffset = arcLen * (1 - pct);

  /* Upper semicircle: sweep 0 so the arc bulges upward (smaller y). */
  const pathD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;

  return (
    <div
      className="relative flex flex-col items-center justify-end"
      style={{ width: size, height: size * 0.65 }}
    >
      {level === "CRITICAL" && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-40 animate-pulse"
          style={{
            boxShadow: `0 0 0 3px ${LEVEL_STROKE.CRITICAL}`,
            width: size * 0.92,
            height: size * 0.92,
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
      <svg width={size} height={size * 0.58} className="overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={18}
          strokeLinecap="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke={LEVEL_STROKE[level]}
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="-mt-2 text-center">
        <p className="font-mono text-4xl tabular-nums text-text-primary">
          {Math.round(score)}
        </p>
        <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 font-mono text-sm",
            level === "LOW" && "text-success",
            level === "MODERATE" && "text-focus-paused",
            level === "HIGH" && "text-danger",
            level === "CRITICAL" && "text-[#7f1d1d]"
          )}
        >
          {level}
        </p>
      </div>
    </div>
  );
}
