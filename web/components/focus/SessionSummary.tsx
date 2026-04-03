"use client";

import { formatTimer } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function SessionSummary({
  plannedSeconds,
  actualSeconds,
  goal,
  status,
  onClose,
}: {
  plannedSeconds: number;
  actualSeconds: number;
  goal: string;
  status: "completed" | "abandoned";
  onClose: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-bg-surface p-8 text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
        Session {status === "completed" ? "complete" : "ended"}
      </p>
      <h2 className="mt-2 font-mono text-2xl text-text-primary">
        {formatTimer(actualSeconds)}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        of {formatTimer(plannedSeconds)} planned
      </p>
      {goal ? (
        <p className="mt-4 text-sm text-text-secondary">“{goal}”</p>
      ) : null}
      <p className="mt-6 text-sm text-text-tertiary">
        Take a breath. When you are ready, start another block or return to the
        dashboard.
      </p>
      <Button className="mt-8 w-full" onClick={onClose}>
        Back to dashboard
      </Button>
    </div>
  );
}
