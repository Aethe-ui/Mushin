"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BurnoutRiskAlert } from "@/components/dashboard/BurnoutRiskAlert";
import { AlertFeed } from "@/components/employer/AlertFeed";
import { EmployeeTable } from "@/components/employer/EmployeeTable";
import { FilterSortBar } from "@/components/employer/FilterSortBar";
import { RiskDistributionChart } from "@/components/employer/RiskDistributionChart";
import { InvitePanel } from "@/components/employer/InvitePanel";
import { TeamSummaryCards } from "@/components/employer/TeamSummaryCards";
import { parseUuidOrNull } from "@/lib/utils";
import type {
  EmployeeSnapshot,
  EmployerAlert,
  FilterRisk,
  FilterState,
  SortKey,
  TeamSummary,
} from "@/types/employer";

export default function EmployerDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgFromUrl = parseUuidOrNull(searchParams.get("org_id"));

  const [orgId, setOrgId] = useState<string | null>(orgFromUrl);
  const [roleChecked, setRoleChecked] = useState(false);
  const [employees, setEmployees] = useState<EmployeeSnapshot[]>([]);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [alerts, setAlerts] = useState<EmployerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("risk_score");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filterState, setFilterState] = useState<FilterState>("ALL");
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("ALL");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employer/check-role");
        if (!res.ok) return;
        const d = (await res.json()) as { orgId: string | null };
        if (cancelled) return;
        if (orgFromUrl) {
          setOrgId(orgFromUrl);
        } else if (d.orgId) {
          setOrgId(d.orgId);
        }
      } finally {
        if (!cancelled) setRoleChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgFromUrl]);

  const loadOverview = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        org_id: orgId,
        sort: sortKey,
        order,
        state: filterState,
        risk: filterRisk,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/employer/overview?${q.toString()}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const data = (await res.json()) as {
        employees: EmployeeSnapshot[];
        team: TeamSummary;
      };
      setEmployees(data.employees);
      setTeam(data.team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
      setEmployees([]);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, sortKey, order, filterState, filterRisk, debouncedSearch]);

  const loadAlerts = useCallback(async () => {
    if (!orgId) return;
    setAlertsLoading(true);
    try {
      const q = new URLSearchParams({ org_id: orgId, status: "active", limit: "50" });
      const res = await fetch(`/api/employer/alerts?${q.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { alerts: EmployerAlert[] };
      setAlerts(data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!roleChecked || !orgId) return;
    void loadOverview();
  }, [roleChecked, orgId, loadOverview]);

  useEffect(() => {
    if (!roleChecked || !orgId) return;
    void loadAlerts();
  }, [roleChecked, orgId, loadAlerts]);

  const onColumnSort = useCallback(
    (k: SortKey) => {
      if (k === sortKey) {
        setOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(k);
        setOrder(k === "display_name" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  const onSortKeyChange = useCallback((k: SortKey) => {
    setSortKey(k);
    setOrder(k === "display_name" ? "asc" : "desc");
  }, []);

  async function handleResolve(alertId: string) {
    try {
      const res = await fetch("/api/employer/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, status: "resolved" }),
      });
      if (res.ok) {
        void loadAlerts();
        void loadOverview();
      }
    } catch {
      /* ignore */
    }
  }

  if (!roleChecked) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-10 rounded bg-bg-surface" />
        <div className="animate-pulse h-48 rounded bg-bg-surface" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6 text-center text-text-secondary">
        <p className="font-mono text-sm">
          No organization linked to your account.{" "}
          <a href="/employer/setup" className="text-accent hover:underline">
            Create an organization
          </a>{" "}
          or ask an admin to add you to <code className="text-text-primary">org_members</code>{" "}
          with role <code className="text-text-primary">admin</code> or{" "}
          <code className="text-text-primary">manager</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Team dashboard
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Aggregate wellbeing signals — no session content or surveillance data.
        </p>
      </div>

      <BurnoutRiskAlert />

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => void loadOverview()}
          >
            Retry
          </button>
        </div>
      )}

      <TeamSummaryCards team={team} />

      {orgId && <InvitePanel orgId={orgId} />}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <RiskDistributionChart team={team} />
        </div>
        <div>
          <AlertFeed
            alerts={alerts}
            onResolve={handleResolve}
            loading={alertsLoading}
          />
        </div>
      </div>

      <FilterSortBar
        search={searchInput}
        onSearch={setSearchInput}
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
        filterState={filterState}
        onFilterState={setFilterState}
        filterRisk={filterRisk}
        onFilterRisk={setFilterRisk}
        order={order}
        onOrderChange={setOrder}
      />

      <EmployeeTable
        employees={employees}
        loading={loading}
        onRowClick={(id) =>
          router.push(`/employer/employee/${id}?org_id=${orgId}`)
        }
        sortKey={sortKey}
        order={order}
        onColumnSort={onColumnSort}
      />
    </div>
  );
}
