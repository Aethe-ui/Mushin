"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFocusStore } from "@/store/focusStore";
import { useFocusSession } from "@/hooks/useFocusSession";
import { FocusTimer } from "@/components/focus/FocusTimer";
import { FocusBar } from "@/components/focus/FocusBar";
import { SessionSummary } from "@/components/focus/SessionSummary";
import { Modal } from "@/components/ui/Modal";

export default function FocusPage() {
  const router = useRouter();
  const status = useFocusStore((s) => s.status);
  const isFocusMode = useFocusStore((s) => s.isFocusMode);
  const setFocusMode = useFocusStore((s) => s.setFocusMode);
  const {
    remainingSeconds,
    goal,
    finalizeRemote,
    clearLocalState,
    pauseRemote,
    resumeRemote,
  } = useFocusSession();

  const [summary, setSummary] = useState<{
    planned: number;
    actual: number;
    goal: string;
    kind: "completed" | "abandoned";
  } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const finalized = useRef(false);

  useEffect(() => {
    if (isFocusMode) document.body.classList.add("focus-mode");
    else document.body.classList.remove("focus-mode");
    return () => document.body.classList.remove("focus-mode");
  }, [isFocusMode]);

  useEffect(() => {
    if (status !== "complete" || finalized.current) return;
    finalized.current = true;
    const st = useFocusStore.getState();
    const actual = st.plannedSeconds - st.remainingSeconds;
    setSummary({
      planned: st.plannedSeconds,
      actual: Math.max(0, actual),
      goal: st.goal,
      kind: "completed",
    });
    void finalizeRemote("completed");
  }, [status, finalizeRemote]);

  useEffect(() => {
    if (status === "idle" && !summary) {
      router.replace("/dashboard");
    }
  }, [status, summary, router]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useFocusStore.getState().status === "active") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  async function handleEnd() {
    const st = useFocusStore.getState();
    await finalizeRemote("abandoned");
    setSummary({
      planned: st.plannedSeconds,
      actual: Math.max(0, st.plannedSeconds - st.remainingSeconds),
      goal: st.goal,
      kind: "abandoned",
    });
    setFocusMode(false);
    clearLocalState();
  }

  async function handlePause() {
    await pauseRemote();
    setFocusMode(false);
  }

  async function handleResume() {
    await resumeRemote();
    setFocusMode(true);
  }

  if (summary) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-24">
        <SessionSummary
          plannedSeconds={summary.planned}
          actualSeconds={summary.actual}
          goal={summary.goal}
          status={summary.kind === "completed" ? "completed" : "abandoned"}
          onClose={() => {
            clearLocalState();
            finalized.current = false;
            router.push("/dashboard");
          }}
        />
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        <Link href="/dashboard" className="text-accent hover:underline">
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <FocusBar
        goal={goal}
        remainingSeconds={remainingSeconds}
        status={status}
        onPause={() => void handlePause()}
        onResume={() => void handleResume()}
        onEnd={() => setLeaveOpen(true)}
      />
      <Modal
        open={leaveOpen}
        title="End focus session?"
        destructive
        confirmLabel="End session"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          void handleEnd();
        }}
      >
        You will save progress and leave deep work mode.
      </Modal>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <FocusTimer
          large
          remainingSeconds={remainingSeconds}
          status={status}
          onStart={() => void handleResume()}
          onPause={() => void handlePause()}
          onEnd={() => setLeaveOpen(true)}
        />
      </div>
    </div>
  );
}
