"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PRESENCE_ACTIVE_MS,
  PRESENCE_HEARTBEAT_MS,
} from "@/lib/constants";
import type { CollaboratorUser } from "@/types/mushin";

export function usePresence(
  workspaceId: string | null,
  userId: string | null,
  collaborators: CollaboratorUser[]
) {
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const mergeActive = useCallback(
    (rows: { user_id: string; last_seen: string }[]) => {
      const now = Date.now();
      const ids = rows
        .filter(
          (r) =>
            now - new Date(r.last_seen).getTime() < PRESENCE_ACTIVE_MS &&
            r.user_id !== userId
        )
        .map((r) => r.user_id);
      setActiveIds(Array.from(new Set(ids)));
    },
    [userId]
  );

  const fetchPresence = useCallback(async () => {
    if (!workspaceId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("presence")
      .select("user_id, last_seen")
      .eq("workspace_id", workspaceId);
    mergeActive((data ?? []) as { user_id: string; last_seen: string }[]);
  }, [workspaceId, mergeActive]);

  const heartbeat = useCallback(async () => {
    if (!workspaceId || !userId) return;
    const supabase = createClient();
    await supabase.from("presence").upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id" }
    );
  }, [workspaceId, userId]);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    void heartbeat();
    const h = setInterval(() => void heartbeat(), PRESENCE_HEARTBEAT_MS);
    return () => clearInterval(h);
  }, [workspaceId, userId, heartbeat]);

  useEffect(() => {
    if (!workspaceId) return;
    void fetchPresence();
    const supabase = createClient();
    const channel = supabase
      .channel(`presence:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presence",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => void fetchPresence()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, fetchPresence]);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    return () => {
      const supabase = createClient();
      void supabase
        .from("presence")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
    };
  }, [workspaceId, userId]);

  const activeCollaborators = useMemo(
    () => collaborators.filter((c) => activeIds.includes(c.user_id)),
    [collaborators, activeIds]
  );

  return { activeCollaborators, activeIds };
}
