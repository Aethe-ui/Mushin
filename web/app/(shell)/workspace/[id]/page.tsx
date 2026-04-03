"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EditorWithFocusFlag } from "@/components/workspace/Editor";
import { CollabPresence } from "@/components/workspace/CollabPresence";
import { AISuggestion } from "@/components/workspace/AISuggestion";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePresence } from "@/hooks/usePresence";
import { useAISuggestion } from "@/hooks/useAISuggestion";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useFocusStore } from "@/store/focusStore";
import type { CollaboratorUser } from "@/types/mushin";

export default function WorkspacePage({ params }: { params: { id: string } }) {
  const workspaceId = params.id;
  const [userId, setUserId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const title = useWorkspaceStore((s) => s.title);
  const setWorkspaceMeta = useWorkspaceStore((s) => s.setWorkspaceMeta);
  const sessionGoal = useFocusStore((s) => s.goal);

  const { content, onContentChange } = useWorkspace(workspaceId, userId);
  const { activeCollaborators } = usePresence(workspaceId, userId, collaborators);
  const { onActivity } = useAISuggestion({
    enabled: true,
    sessionGoal,
    hideInFocusMode: true,
  });

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (cancelled) return;
      if (!res.ok) {
        setLoadError("Could not load workspace");
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      setWorkspaceMeta(data.workspace.id, data.workspace.title);
      setCollaborators(data.collaborators ?? []);
      setIsOwner(data.workspace.owner_id === userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, userId, setWorkspaceMeta]);

  async function onTitleSave(t: string) {
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    setWorkspaceMeta(workspaceId, t);
  }

  if (loadError) {
    return <p className="text-text-secondary">{loadError}</p>;
  }

  return (
    <div
      className="relative flex min-h-[70vh] flex-col"
      onMouseMove={onActivity}
    >
      <WorkspaceHeader
        workspaceId={workspaceId}
        title={title || "Untitled"}
        isOwner={isOwner}
        onTitleSave={onTitleSave}
      />
      <div className="mb-4">
        <CollabPresence users={activeCollaborators} />
      </div>
      <EditorWithFocusFlag
        value={content}
        onChange={onContentChange}
        onActivity={onActivity}
      />
      <AISuggestion />
    </div>
  );
}
