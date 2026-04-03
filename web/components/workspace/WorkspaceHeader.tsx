"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function WorkspaceHeader({
  workspaceId,
  title,
  isOwner,
  onTitleSave,
}: {
  workspaceId: string;
  title: string;
  isOwner: boolean;
  onTitleSave: (t: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [shareOpen, setShareOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);

  async function saveTitle() {
    await onTitleSave(draft.trim() || "Untitled");
    setEditing(false);
  }

  async function sendInvite() {
    setShareError(null);
    const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setShareError(data.error ?? "Invite failed");
      return;
    }
    setShareOpen(false);
    setEmail("");
  }

  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/dashboard"
          className="text-xs text-text-tertiary hover:text-text-secondary"
        >
          ← Dashboard
        </Link>
        {editing && isOwner ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && void saveTitle()}
            className="min-w-0 flex-1 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-lg text-text-primary focus:border-border-active focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="truncate text-left font-mono text-lg text-text-primary hover:text-accent"
            onClick={() => isOwner && setEditing(true)}
          >
            {title}
          </button>
        )}
      </div>
      {isOwner && (
        <Button variant="ghost" className="text-xs" onClick={() => setShareOpen(true)}>
          Share
        </Button>
      )}
      <Modal
        open={shareOpen}
        title="Invite collaborator"
        onCancel={() => setShareOpen(false)}
        onConfirm={() => void sendInvite()}
        confirmLabel="Send invite"
      >
        <p className="mb-2 text-text-secondary">
          Enter the teammate&apos;s account email. They must already have a
          Mushin account.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-2 w-full rounded border border-border bg-bg-primary px-3 py-2 text-text-primary"
        />
        {shareError && (
          <p className="mt-2 text-sm text-danger">{shareError}</p>
        )}
      </Modal>
    </header>
  );
}
