"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";
import type { OrgInvitation, InvitationRole } from "@/types/employer";

const STATUS_TONE = {
  pending: "paused",
  accepted: "complete",
  rejected: "neutral",
  expired: "neutral",
} as const;

export function InvitePanel({ orgId }: { orgId: string }) {
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/invitations?org_id=${orgId}`);
      if (res.ok) setInvitations((await res.json()).invitations ?? []);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const res = await fetch("/api/employer/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, email: email.trim(), role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      setSuccess(`Invitation sent to ${email}`);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  async function resend(token: string) {
    await fetch(`/api/employer/invitations/${token}/resend`, { method: "POST" });
    setSuccess("Invitation resent.");
  }

  return (
    <div className="space-y-6 rounded-lg border border-border bg-bg-surface p-6">
      <div>
        <h2 className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Invite team member
        </h2>
        <form onSubmit={(e) => void sendInvite(e)} className="mt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-active focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InvitationRole)}
              className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-border-active focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
            <Button type="submit" disabled={sending || !email.trim()} className="shrink-0 text-sm">
              {sending ? "Sending…" : "Send invite"}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}
        </form>
      </div>

      <div>
        <h2 className="font-mono text-sm uppercase tracking-widest text-text-tertiary">
          Pending & past invitations
        </h2>
        {loading ? (
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-bg-elevated" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <p className="mt-3 text-sm text-text-tertiary">No invitations sent yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-primary px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-text-primary">{inv.email}</p>
                  <p className="text-xs text-text-tertiary">
                    {inv.role} · sent {formatRelativeTime(inv.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                  {inv.status === "pending" && (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => void resend(inv.token)}
                    >
                      Resend
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
