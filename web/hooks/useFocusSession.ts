"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFocusStore } from "@/store/focusStore";

const LS_END = "mushin_session_end";
const LS_GOAL = "mushin_session_goal";
const LS_ID = "mushin_session_id";
const LS_PLANNED = "mushin_planned_seconds";
const LS_WS = "mushin_workspace_id";

function clearLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_END);
  localStorage.removeItem(LS_GOAL);
  localStorage.removeItem(LS_ID);
  localStorage.removeItem(LS_PLANNED);
  localStorage.removeItem(LS_WS);
}

function persistLocal(payload: {
  endTime: number;
  goal: string;
  sessionId: string;
  plannedSeconds: number;
  workspaceId: string | null;
}) {
  localStorage.setItem(LS_END, String(payload.endTime));
  localStorage.setItem(LS_GOAL, payload.goal);
  localStorage.setItem(LS_ID, payload.sessionId);
  localStorage.setItem(LS_PLANNED, String(payload.plannedSeconds));
  if (payload.workspaceId) localStorage.setItem(LS_WS, payload.workspaceId);
  else localStorage.removeItem(LS_WS);
}

export function useFocusSession() {
  const status = useFocusStore((s) => s.status);
  const sessionId = useFocusStore((s) => s.sessionId);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const plannedSeconds = useFocusStore((s) => s.plannedSeconds);
  const goal = useFocusStore((s) => s.goal);
  const tick = useFocusStore((s) => s.tick);
  const hydrateFromStorage = useFocusStore((s) => s.hydrateFromStorage);
  const endSession = useFocusStore((s) => s.endSession);
  const pauseSession = useFocusStore((s) => s.pauseSession);
  const resumeSession = useFocusStore((s) => s.resumeSession);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncTick = useCallback(() => {
    const end = localStorage.getItem(LS_END);
    if (!end) return;
    const remaining = Math.max(0, Math.ceil((parseInt(end, 10) - Date.now()) / 1000));
    useFocusStore.getState().setRemaining(remaining);
    if (remaining <= 0) {
      useFocusStore.setState({ status: "complete", remainingSeconds: 0, isFocusMode: false });
    }
  }, []);

  useEffect(() => {
    const savedEnd = localStorage.getItem(LS_END);
    const savedId = localStorage.getItem(LS_ID);
    const savedGoal = localStorage.getItem(LS_GOAL) ?? "";
    const savedPlanned = localStorage.getItem(LS_PLANNED);
    const savedWs = localStorage.getItem(LS_WS);
    if (savedEnd && savedId && savedPlanned) {
      const endTime = parseInt(savedEnd, 10);
      const remaining = endTime - Date.now();
      if (remaining > 0) {
        hydrateFromStorage({
          sessionId: savedId,
          endTime,
          goal: savedGoal,
          plannedSeconds: parseInt(savedPlanned, 10),
          workspaceId: savedWs || null,
        });
      } else {
        clearLocal();
      }
    }
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (status !== "active") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      tick();
      const st = useFocusStore.getState();
      if (st.status !== "active") return;
      const endTime = Date.now() + st.remainingSeconds * 1000;
      persistLocal({
        endTime,
        goal: st.goal,
        sessionId: st.sessionId!,
        plannedSeconds: st.plannedSeconds,
        workspaceId: st.workspaceId,
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, tick]);

  useEffect(() => {
    const onUnload = () => {
      const st = useFocusStore.getState();
      if (st.status !== "active" || !st.sessionId) return;
      const actual = st.plannedSeconds - st.remainingSeconds;
      const blob = new Blob(
        [
          JSON.stringify({
            session_id: st.sessionId,
            status: "abandoned",
            actual_duration: Math.max(0, actual),
          }),
        ],
        { type: "application/json" }
      );
      navigator.sendBeacon("/api/sessions/end", blob);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const finalizeRemote = useCallback(
    async (statusEnd: "completed" | "abandoned") => {
      const st = useFocusStore.getState();
      if (!st.sessionId) return;
      const actual = st.plannedSeconds - st.remainingSeconds;
      await fetch("/api/sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: st.sessionId,
          status: statusEnd,
          actual_duration: Math.max(0, actual),
        }),
      });
    },
    []
  );

  const clearLocalState = useCallback(() => {
    clearLocal();
    endSession();
  }, [endSession]);

  const endRemote = useCallback(
    async (statusEnd: "completed" | "abandoned") => {
      await finalizeRemote(statusEnd);
      clearLocalState();
    },
    [finalizeRemote, clearLocalState]
  );

  const pauseRemote = useCallback(async () => {
    const id = useFocusStore.getState().sessionId;
    pauseSession();
    if (id) {
      await fetch(`/api/sessions/${id}/pause`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [pauseSession]);

  const resumeRemote = useCallback(async () => {
    const st = useFocusStore.getState();
    const sid = st.sessionId;
    resumeSession();
    if (sid) {
      await fetch(`/api/sessions/${sid}/pause`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
    }
    if (!sid) return;
    const endTime = Date.now() + st.remainingSeconds * 1000;
    persistLocal({
      endTime,
      goal: st.goal,
      sessionId: sid,
      plannedSeconds: st.plannedSeconds,
      workspaceId: st.workspaceId,
    });
  }, [resumeSession]);

  return {
    remainingSeconds,
    status,
    goal,
    sessionId,
    plannedSeconds,
    syncTick,
    endRemote,
    finalizeRemote,
    clearLocalState,
    pauseRemote,
    resumeRemote,
    clearLocal,
    persistLocal,
  };
}
