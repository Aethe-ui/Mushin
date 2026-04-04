"use client";

const SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  OVERWORK: {
    label: "HIGH",
    color: "var(--danger)",
    bg: "var(--danger)",
  },
  DECREASING_RECOVERY: {
    label: "MEDIUM",
    color: "var(--focus-paused)",
    bg: "var(--focus-paused)",
  },
};

const PATTERN_COPY: Record<
  string,
  { title: string; description: string; icon: string }
> = {
  OVERWORK: {
    icon: "⚡",
    title: "Repeated Overwork",
    description:
      "Your workout/focus time has exceeded 2× rest for 3+ consecutive days. This significantly raises burnout risk.",
  },
  DECREASING_RECOVERY: {
    icon: "📉",
    title: "Declining Recovery",
    description:
      "Your rest hours have been consistently dropping. Reduced recovery accelerates cognitive and physical fatigue.",
  },
};

export function BurnoutPatternInsights({ patterns }: { patterns: string[] }) {
  if (patterns.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Pattern Insights
        </p>
        <p className="text-sm text-success">
          ✓ No harmful patterns detected in the past 5 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
        Pattern Insights
      </p>
      {patterns.map((pattern) => {
        const copy = PATTERN_COPY[pattern];
        const sev = SEVERITY[pattern];
        if (!copy || !sev) return null;
        return (
          <div
            key={pattern}
            className="rounded-lg border p-4"
            style={{
              borderColor: `${sev.bg}44`,
              backgroundColor: `${sev.bg}0d`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{copy.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-text-primary">
                    {copy.title}
                  </p>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: sev.color,
                      backgroundColor: `${sev.bg}22`,
                    }}
                  >
                    {sev.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {copy.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
