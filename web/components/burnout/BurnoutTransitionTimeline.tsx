"use client";

const STATE_COLORS: Record<string, string> = {
  NORMAL: "var(--focus-active)",
  STRAIN: "var(--focus-paused)",
  BURNOUT: "var(--danger)",
};
const STATE_EMOJI: Record<string, string> = {
  NORMAL: "🟢",
  STRAIN: "🟡",
  BURNOUT: "🔴",
};

export function BurnoutTransitionTimeline({
  transitions,
  dates,
}: {
  transitions: (string | null)[];
  dates: string[];
}) {
  const stateDays = dates
    .map((date, i) => ({
      date: date.slice(5),
      state: transitions[i] ?? null,
    }))
    .filter((d) => d.state !== null) as { date: string; state: string }[];

  if (stateDays.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          State Timeline
        </p>
        <p className="text-sm text-text-tertiary">
          No state history yet. Log workout and rest to begin tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-text-tertiary">
        State Transition Timeline
      </p>
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {stateDays.map((day, i) => (
          <div key={day.date} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md transition-transform hover:scale-110"
                style={{
                  backgroundColor: STATE_COLORS[day.state],
                  color: "#fff",
                  boxShadow: `0 0 10px ${STATE_COLORS[day.state]}55`,
                }}
                title={`${day.date}: ${day.state}`}
              >
                {STATE_EMOJI[day.state]}
              </span>
              <span className="text-center font-mono text-[10px] text-text-tertiary">
                {day.date}
              </span>
              <span
                className="text-center font-mono text-[9px] font-semibold uppercase"
                style={{ color: STATE_COLORS[day.state] }}
              >
                {day.state}
              </span>
            </div>
            {i < stateDays.length - 1 && (
              <div className="mx-1 flex shrink-0 items-center pb-8">
                <div className="h-px w-6 bg-border" />
                <span className="text-xs text-text-tertiary">›</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
