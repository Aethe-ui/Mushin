"use client";

import { Timer } from "@/components/ui/Timer";
import { Button } from "@/components/ui/Button";
import type { SessionStatus } from "@/types/mushin";

export function FocusTimer({
  remainingSeconds,
  status,
  onStart,
  onPause,
  onEnd,
  large,
}: {
  remainingSeconds: number;
  status: SessionStatus;
  onStart: () => void;
  onPause: () => void;
  onEnd: () => void;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-8">
      <Timer
        seconds={remainingSeconds}
        pulse={status === "active"}
        className={large ? "text-[min(18vw,8rem)] leading-none" : "text-4xl"}
      />
      <div className="flex gap-3">
        {status === "idle" && (
          <Button onClick={onStart}>Start</Button>
        )}
        {status === "active" && (
          <>
            <Button variant="ghost" onClick={onPause}>
              Pause
            </Button>
            <Button variant="danger" onClick={onEnd}>
              End
            </Button>
          </>
        )}
        {status === "break" && (
          <>
            <Button onClick={onStart}>Resume</Button>
            <Button variant="danger" onClick={onEnd}>
              End
            </Button>
          </>
        )}
        {status === "complete" && (
          <Button variant="ghost" onClick={onEnd}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
