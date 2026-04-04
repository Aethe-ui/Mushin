"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type InviteDetails = {
  id: string;
  org_id: string;
  org_name: string;
  email: string;
  role: string;
  expires_at: string;
};

type Step = "loading" | "login-required" | "confirm" | "done" | "error";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [action, setAction] = useState<"accepted" | "rejected" | null>(null);
  const [busy, setBusy] = useState(false);

  const [authEmail, setAuthEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const isAuthed = !!user;
      setAuthEmail(user?.email ?? "");

      const res = await fetch(`/api/employer/invitations/${token}`);
      const data = (await res.json()) as { error?: string; invitation?: InviteDetails };
      if (cancelled) return;
      if (!res.ok) {
        setErrMsg(data.error ?? "Invitation not found");
        setStep("error");
        return;
      }
      setInvite(data.invitation!);
      setStep(isAuthed ? "confirm" : "login-required");
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function respond(act: "accept" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/employer/invitations/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErrMsg(data.error ?? "Something went wrong");
      setStep("error");
      return;
    }
    setAction(act === "accept" ? "accepted" : "rejected");
    setStep("done");
    setBusy(false);
    if (act === "accept") {
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-text-tertiary">Loading invitation…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-danger/30 bg-danger/10 p-8 text-center">
          <p className="font-mono text-sm text-danger">{errMsg}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (step === "login-required") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-8 text-center">
          <h1 className="font-mono text-lg text-text-primary">You have an invitation</h1>
          {invite && (
            <p className="mt-2 text-sm text-text-secondary">
              You&apos;ve been invited to join{" "}
              <strong className="text-text-primary">{invite.org_name}</strong> as a{" "}
              <strong className="text-text-primary">{invite.role}</strong> on Mushin.
            </p>
          )}
          <p className="mt-4 text-sm text-text-tertiary">
            Please sign in or create an account to respond.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href={`/auth/login?next=/invite/${token}`}>
              <Button className="w-full">Sign in</Button>
            </Link>
            <Link href={`/auth/signup?next=/invite/${token}`}>
              <Button variant="ghost" className="w-full">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-8 text-center">
          <p className="font-mono text-lg text-text-primary">
            {action === "accepted" ? "✓ Invitation accepted!" : "Invitation declined."}
          </p>
          {action === "accepted" && (
            <p className="mt-2 text-sm text-text-secondary">Redirecting to your dashboard…</p>
          )}
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-8">
        <h1 className="font-mono text-lg text-text-primary">Team invitation</h1>
        {invite && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-text-secondary">
              Organization: <strong className="text-text-primary">{invite.org_name}</strong>
            </p>
            <p className="text-sm text-text-secondary">
              Role: <strong className="text-text-primary capitalize">{invite.role}</strong>
            </p>
            <p className="text-sm text-text-secondary">
              Sent to: <strong className="text-text-primary">{invite.email}</strong>
            </p>
            {authEmail && authEmail.toLowerCase() !== invite.email.toLowerCase() && (
              <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">
                ⚠ You are signed in as <strong>{authEmail}</strong> but this invite was sent to{" "}
                <strong>{invite.email}</strong>. Please sign in with the correct account.
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            disabled={
              busy ||
              (!!authEmail && authEmail.toLowerCase() !== invite?.email.toLowerCase())
            }
            onClick={() => void respond("accept")}
          >
            {busy ? "Processing…" : "Accept"}
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            disabled={busy}
            onClick={() => void respond("reject")}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
