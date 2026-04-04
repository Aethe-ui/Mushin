"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function EmployerSetupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/employer/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const data = (await res.json()) as { error?: string; organization?: { id: string } };
      if (!res.ok) throw new Error(data.error ?? "Failed to create organization");
      router.replace(`/employer?org_id=${data.organization!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-mono text-2xl text-text-primary">Create your organization</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Set up your workspace to start monitoring your team&apos;s wellbeing.
      </p>
      <form onSubmit={create} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-text-tertiary">Organization name</label>
          <input
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-text-primary focus:border-border-active focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !orgName.trim()}>
          {loading ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </div>
  );
}
