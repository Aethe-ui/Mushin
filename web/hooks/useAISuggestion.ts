"use client";

import { useCallback, useEffect, useRef } from "react";
import { AI_INACTIVITY_MS, AI_PANEL_FADE_MS } from "@/lib/constants";
import { useFocusStore } from "@/store/focusStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useAISuggestion(opts: {
  enabled: boolean;
  sessionGoal?: string;
  hideInFocusMode?: boolean;
}) {
  const showSuggestion = useWorkspaceStore((s) => s.showSuggestion);
  const dismissSuggestion = useWorkspaceStore((s) => s.dismissSuggestion);
  const isFocusMode = useFocusStore((s) => s.isFocusMode);
  const content = useWorkspaceStore((s) => s.content);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivity = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!opts.enabled) return;
    if (opts.hideInFocusMode && isFocusMode) return;

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_content: content.slice(0, 8000),
            session_goal: opts.sessionGoal ?? "",
            user_signal: "inactivity",
          }),
        });
        const data = await res.json();
        const text = data.suggestion_text as string;
        if (text?.trim()) {
          showSuggestion(text.trim());
          if (fadeRef.current) clearTimeout(fadeRef.current);
          fadeRef.current = setTimeout(() => dismissSuggestion(), AI_PANEL_FADE_MS);
        }
      } catch {
        // silent fail per spec
      }
    }, AI_INACTIVITY_MS);
  }, [
    opts.enabled,
    opts.hideInFocusMode,
    opts.sessionGoal,
    content,
    isFocusMode,
    showSuggestion,
    dismissSuggestion,
  ]);

  useEffect(() => {
    resetInactivity();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, [resetInactivity]);

  const onActivity = useCallback(() => {
    resetInactivity();
  }, [resetInactivity]);

  return { onActivity };
}
