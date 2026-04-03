"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { WORKSPACE_SAVE_DEBOUNCE_MS } from "@/lib/constants";
import { debounce } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useWorkspace(workspaceId: string | null, userId: string | null) {
  const content = useWorkspaceStore((s) => s.content);
  const setContent = useWorkspaceStore((s) => s.setContent);
  const setSaving = useWorkspaceStore((s) => s.setSaving);
  const setLastSavedAt = useWorkspaceStore((s) => s.setLastSavedAt);
  const setWorkspaceMeta = useWorkspaceStore((s) => s.setWorkspaceMeta);
  const reset = useWorkspaceStore((s) => s.reset);

  const localRef = useRef(content);
  localRef.current = content;

  const saveFn = useMemo(
    () =>
      debounce(async (id: string, text: string) => {
        setSaving(true);
        try {
          const res = await fetch(`/api/workspaces/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text }),
          });
          if (res.ok) setLastSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      }, WORKSPACE_SAVE_DEBOUNCE_MS),
    [setSaving, setLastSavedAt]
  );

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setWorkspaceMeta(data.workspace.id, data.workspace.title);
      setContent(data.workspace.content ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, setWorkspaceMeta, setContent]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [workspaceId, reset]);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workspaces",
          filter: `id=eq.${workspaceId}`,
        },
        (payload) => {
          const next = (payload.new as { content?: string }).content ?? "";
          if (next !== localRef.current) setContent(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, userId, setContent]);

  const onContentChange = useCallback(
    (text: string) => {
      setContent(text);
      if (workspaceId) saveFn(workspaceId, text);
    },
    [workspaceId, setContent, saveFn]
  );

  return { content, onContentChange };
}
