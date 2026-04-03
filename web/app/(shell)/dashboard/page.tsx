"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SessionLauncher } from "@/components/dashboard/SessionLauncher";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { Button } from "@/components/ui/Button";
import type { CollaboratorUser, SessionRow } from "@/types/mushin";

type WorkspaceListItem = {
  id: string;
  title: string;
  updated_at: string;
  collaborator_preview?: CollaboratorUser[];
};

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [wsRes, histRes] = await Promise.all([
          fetch("/api/workspaces"),
          fetch("/api/sessions/history?limit=3&offset=0"),
        ]);
        if (cancelled) return;
        if (wsRes.ok) {
          const j = await wsRes.json();
          setWorkspaces(j.workspaces ?? []);
        }
        if (histRes.ok) {
          const j = await histRes.json();
          setSessions(j.sessions ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function newWorkspace() {
    setCreateLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.workspace?.id) {
        window.location.href = `/workspace/${data.workspace.id}`;
      }
    } finally {
      setCreateLoading(false);
    }
  }

  const greeting = email
    ? `Welcome back, ${email.split("@")[0]}`
    : "Welcome";

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl text-text-primary">{greeting}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Protect your attention. Start a timed block when you are ready.
          </p>
        </div>
        <SessionLauncher
          workspaces={workspaces.map((w) => ({ id: w.id, title: w.title }))}
        />
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
            Workspaces
          </h2>
          <Button
            variant="ghost"
            className="text-xs"
            disabled={createLoading}
            onClick={() => void newWorkspace()}
          >
            {createLoading ? "Creating…" : "New workspace"}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No workspaces yet. Create one to capture notes during focus.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {workspaces.map((w) => (
              <WorkspaceCard
                key={w.id}
                id={w.id}
                title={w.title}
                updatedAt={w.updated_at}
                collaborators={w.collaborator_preview}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Recent sessions
        </h2>
        <RecentSessions sessions={sessions} />
      </section>
    </div>
  );
}
