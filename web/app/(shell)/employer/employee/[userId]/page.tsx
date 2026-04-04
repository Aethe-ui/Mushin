"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EmployeeDrillDown } from "@/components/employer/EmployeeDrillDown";
import { Button } from "@/components/ui/Button";
import { parseUuidOrNull } from "@/lib/utils";
import type { EmployeeDetail } from "@/types/employer";

export default function EmployerEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const orgId = parseUuidOrNull(searchParams.get("org_id"));

  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !userId) {
      setError("Missing org or user");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ org_id: orgId, days: "7" });
      const res = await fetch(`/api/employer/employee/${userId}?${q.toString()}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      setDetail((await res.json()) as EmployeeDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employee");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!orgId) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6 text-center text-text-secondary">
        Missing <code className="text-text-primary">org_id</code> in URL. Open
        the team dashboard first, then select an employee.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 w-64 rounded bg-bg-surface" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-20 rounded bg-bg-surface" />
          ))}
        </div>
        <div className="animate-pulse h-64 rounded bg-bg-surface" />
        <div className="animate-pulse h-40 rounded bg-bg-surface" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-6 text-center">
        <p className="text-sm text-danger">{error ?? "Not found"}</p>
        <Button variant="ghost" className="mt-4 text-xs" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <EmployeeDrillDown detail={detail} onBack={() => router.back()} />
  );
}
