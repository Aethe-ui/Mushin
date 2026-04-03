"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIMER_PRESETS_SECONDS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { SessionGoal } from "@/components/focus/SessionGoal";
import { useFocusStore } from "@/store/focusStore";

function persistLocal(payload: {
  endTime: number;
  goal: string;
  sessionId: string;
  plannedSeconds: number;
  workspaceId: string | null;
}) {
  localStorage.setItem("mushin_session_end", String(payload.endTime));
  localStorage.setItem("mushin_session_goal", payload.goal);
  localStorage.setItem("mushin_session_id", payload.sessionId);
  localStorage.setItem("mushin_planned_seconds", String(payload.plannedSeconds));
  if (payload.workspaceId) localStorage.setItem("mushin_workspace_id", payload.workspaceId);
  else localStorage.removeItem("mushin_workspace_id");
}

export function SessionLauncher({
  workspaces,
}: {
  workspaces: { id: string; title: string }[];
}) {
  const router = useRouter();
  const startSession = useFocusStore((s) => s.startSession);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<"25" | "50" | "custom">("25");
  const [customMin, setCustomMin] = useState(45);
  const [goal, setGoal] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const plannedSeconds =
    preset === "25"
      ? TIMER_PRESETS_SECONDS.short
      : preset === "50"
        ? TIMER_PRESETS_SECONDS.long
        : Math.max(1, customMin) * 60;

  async function enterFocus() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planned_duration: plannedSeconds,
          goal: goal.trim() || undefined,
          workspace_id: workspaceId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start session");
        return;
      }
      const sessionId = data.session_id as string;
      const endTime = Date.now() + plannedSeconds * 1000;
      persistLocal({
        endTime,
        goal: goal.trim(),
        sessionId,
        plannedSeconds,
        workspaceId: workspaceId || null,
      });
      startSession(sessionId, plannedSeconds, goal.trim(), workspaceId || null);
      setOpen(false);
      router.push("/focus");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-extras">
      {!open ? (
        <Button
          className="w-full py-4 text-base sm:w-auto sm:px-10"
          onClick={() => setOpen(true)}
        >
          Start focus session
        </Button>
      ) : (
        <div className="rounded-lg border border-border bg-bg-surface p-6">
          <p className="font-mono text-sm text-text-tertiary">Duration</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["25", "25 min"],
                ["50", "50 min"],
                ["custom", "Custom"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                variant={preset === k ? "primary" : "ghost"}
                className="text-xs"
                onClick={() => setPreset(k)}
              >
                {label}
              </Button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={180}
                value={customMin}
                onChange={(e) => setCustomMin(parseInt(e.target.value, 10) || 1)}
                className="w-24 rounded border border-border bg-bg-primary px-2 py-1 text-text-primary"
              />
              <span className="text-sm text-text-secondary">minutes</span>
            </div>
          )}
          <div className="mt-6">
            <SessionGoal
              value={goal}
              onChange={setGoal}
              onSkip={() => setGoal("")}
            />
          </div>
          <label className="mt-4 block text-sm text-text-secondary">
            Link workspace (optional)
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-bg-primary px-3 py-2 text-text-primary"
            >
              <option value="">None</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button disabled={loading} onClick={() => void enterFocus()}>
              Enter focus
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
