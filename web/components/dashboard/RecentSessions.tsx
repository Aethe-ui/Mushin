import { Badge } from "@/components/ui/Badge";
import { formatTimer } from "@/lib/utils";
import type { SessionRow } from "@/types/mushin";

function tone(
  s: SessionRow["status"]
): "neutral" | "active" | "paused" | "complete" {
  if (s === "completed") return "complete";
  if (s === "paused") return "paused";
  if (s === "active") return "active";
  return "neutral";
}

export function RecentSessions({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-text-tertiary">No sessions yet. Start one above.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-primary px-3 py-2"
        >
          <div>
            <p className="text-sm text-text-primary">
              {s.duration != null
                ? formatTimer(s.duration)
                : s.planned_duration != null
                  ? formatTimer(s.planned_duration)
                  : "—"}{" "}
              <span className="text-text-tertiary">logged</span>
            </p>
            {s.goal && (
              <p className="mt-0.5 max-w-md truncate text-xs text-text-secondary">
                {s.goal}
              </p>
            )}
          </div>
          <Badge tone={tone(s.status)}>{s.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
