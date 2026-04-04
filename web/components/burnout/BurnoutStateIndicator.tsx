"use client";

import type { BurnoutState } from "@/types/performance";

const STATE_CONFIG = {
  NORMAL: {
    color: "var(--focus-active)",
    label: "NORMAL",
    emoji: "●",
    animDuration: "2.5s",
  },
  STRAIN: {
    color: "var(--focus-paused)",
    label: "STRAIN",
    emoji: "●",
    animDuration: "1.4s",
  },
  BURNOUT: {
    color: "var(--danger)",
    label: "BURNOUT",
    emoji: "●",
    animDuration: "0.8s",
  },
};

export function BurnoutStateIndicator({ state }: { state: BurnoutState }) {
  const cfg = STATE_CONFIG[state];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <span
          className="absolute inline-flex h-28 w-28 rounded-full opacity-30"
          style={{
            backgroundColor: cfg.color,
            animation: `burnout-pulse ${cfg.animDuration} ease-in-out infinite`,
          }}
        />
        <span
          className="relative flex h-20 w-20 items-center justify-center rounded-full font-mono text-2xl text-white shadow-lg"
          style={{ backgroundColor: cfg.color }}
        >
          {cfg.emoji}
        </span>
      </div>
      <span
        className="font-mono text-lg font-bold uppercase tracking-widest"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
      <style>{`
        @keyframes burnout-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%       { transform: scale(1.4); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
