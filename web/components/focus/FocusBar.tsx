"use client";

import Link from "next/link";
import { Timer } from "@/components/ui/Timer";
import { Button } from "@/components/ui/Button";
import type { SessionStatus } from "@/types/mushin";

export function FocusBar({
  goal,
  remainingSeconds,
  status,
  onPause,
  onResume,
  onEnd,
}: {
  goal: string;
  remainingSeconds: number;
  status: SessionStatus;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  return (
    <header className="focus-bar fixed left-0 right-0 top-0 z-50 hidden items-center justify-between border-b border-border bg-bg-primary/90 px-4 py-3 backdrop-blur-md">
      <Link
        href="/dashboard"
        className="font-mono text-sm text-text-secondary hover:text-text-primary"
      >
        Mushin
      </Link>
      <p className="mx-4 max-w-md flex-1 truncate text-center text-sm text-text-secondary">
        {goal || "Deep work"}
      </p>
      <div className="flex items-center gap-3">
        <Timer seconds={remainingSeconds} className="text-lg" />
        {status === "active" && (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onPause}>
            Pause
          </Button>
        )}
        {status === "break" && (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onResume}>
            Resume
          </Button>
        )}
        <Button variant="danger" className="px-2 py-1 text-xs" onClick={onEnd}>
          End
        </Button>
      </div>
    </header>
  );
}
