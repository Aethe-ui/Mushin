import { create } from "zustand";
import type { SessionStatus } from "@/types/mushin";

interface FocusState {
  status: SessionStatus;
  isFocusMode: boolean;
  sessionId: string | null;
  remainingSeconds: number;
  plannedSeconds: number;
  goal: string;
  startTime: number | null;
  workspaceId: string | null;

  startSession: (
    sessionId: string,
    plannedSeconds: number,
    goal: string,
    workspaceId?: string | null
  ) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  tick: () => void;
  setFocusMode: (active: boolean) => void;
  setRemaining: (seconds: number) => void;
  hydrateFromStorage: (payload: {
    sessionId: string;
    endTime: number;
    goal: string;
    plannedSeconds: number;
    workspaceId?: string | null;
  }) => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  status: "idle",
  isFocusMode: false,
  sessionId: null,
  remainingSeconds: 0,
  plannedSeconds: 0,
  goal: "",
  startTime: null,
  workspaceId: null,

  startSession: (sessionId, plannedSeconds, goal, workspaceId = null) => {
    const startTime = Date.now();
    set({
      status: "active",
      sessionId,
      plannedSeconds,
      remainingSeconds: plannedSeconds,
      goal,
      startTime,
      workspaceId,
      isFocusMode: true,
    });
  },

  pauseSession: () => {
    if (get().status === "active") set({ status: "break" });
  },

  resumeSession: () => {
    if (get().status === "break") set({ status: "active" });
  },

  endSession: () =>
    set({
      status: "idle",
      isFocusMode: false,
      sessionId: null,
      remainingSeconds: 0,
      plannedSeconds: 0,
      goal: "",
      startTime: null,
      workspaceId: null,
    }),

  tick: () => {
    const { status, remainingSeconds } = get();
    if (status !== "active") return;
    if (remainingSeconds <= 1) {
      set({ status: "complete", remainingSeconds: 0, isFocusMode: false });
      return;
    }
    set({ remainingSeconds: remainingSeconds - 1 });
  },

  setFocusMode: (active) => set({ isFocusMode: active }),

  setRemaining: (seconds) => set({ remainingSeconds: seconds }),

  hydrateFromStorage: ({
    sessionId,
    endTime,
    goal,
    plannedSeconds,
    workspaceId = null,
  }) => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (remaining <= 0) return;
    set({
      status: "active",
      sessionId,
      plannedSeconds,
      remainingSeconds: remaining,
      goal,
      startTime: endTime - plannedSeconds * 1000,
      workspaceId,
      isFocusMode: true,
    });
  },
}));
