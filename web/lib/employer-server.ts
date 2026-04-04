import type { SupabaseClient } from "@supabase/supabase-js";
import type { BurnoutState, RiskLevel } from "@/types/performance";
import type { EmployeeSnapshot, TeamSummary } from "@/types/employer";
import { parseUuidOrNull } from "@/lib/utils";

export async function assertEmployerStaffForOrg(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  const role = data.role as string;
  return role === "admin" || role === "manager";
}

export function parseOrgIdParam(request: Request): string | null {
  const { searchParams } = new URL(request.url);
  return parseUuidOrNull(searchParams.get("org_id"));
}

/** Resolve auth user id by email via Admin API (paginated; fine for modest user counts). */
export async function findUserIdByEmail(
  svc: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  try {
    const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = data?.users?.find((x) => x.email?.toLowerCase() === normalized);
    return u?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchUserEmailsById(
  svc: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await svc.auth.admin.getUserById(id);
      if (!error && data.user?.email) {
        map.set(id, data.user.email);
      }
    })
  );
  return map;
}

function computeStreakDays(
  datesWithActivity: Set<string>,
  endDate: Date
): number {
  let streakDays = 0;
  const check = new Date(endDate);
  for (let i = 0; i < 365; i++) {
    const d = check.toISOString().slice(0, 10);
    check.setDate(check.getDate() - 1);
    if (datesWithActivity.has(d)) streakDays++;
    else break;
  }
  return streakDays;
}

export async function fetchStreakDaysByUser(
  svc: SupabaseClient,
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const streakFrom = new Date();
  streakFrom.setDate(streakFrom.getDate() - 365);
  const streakFromStr = streakFrom.toISOString().slice(0, 10);
  const end = new Date();

  const { data: rows } = await svc
    .from("performance_snapshots")
    .select("user_id, snapshot_date, performance_score")
    .in("user_id", userIds)
    .gte("snapshot_date", streakFromStr);

  const byUser = new Map<string, Set<string>>();
  for (const id of userIds) {
    byUser.set(id, new Set());
  }
  for (const r of rows ?? []) {
    const uid = String(r.user_id);
    if (Number(r.performance_score) > 0) {
      byUser.get(uid)?.add(String(r.snapshot_date));
    }
  }

  for (const id of userIds) {
    map.set(id, computeStreakDays(byUser.get(id) ?? new Set(), end));
  }
  return map;
}

const RISK_LEVELS: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];

function isRiskLevel(s: string): s is RiskLevel {
  return RISK_LEVELS.includes(s as RiskLevel);
}

function isBurnoutState(s: string): s is BurnoutState {
  return s === "NORMAL" || s === "STRAIN" || s === "BURNOUT";
}

export function buildTeamSummary(
  employees: EmployeeSnapshot[],
  activeAlertCount: number
): TeamSummary {
  let healthy = 0;
  let warning = 0;
  let critical = 0;
  let riskSum = 0;
  for (const e of employees) {
    const r = e.risk_score;
    riskSum += r;
    if (r < 40) healthy++;
    else if (r < 70) warning++;
    else critical++;
  }
  const n = employees.length;
  return {
    total_members: n,
    healthy_count: healthy,
    warning_count: warning,
    critical_count: critical,
    avg_risk_score: n === 0 ? 0 : Math.round((riskSum / n) * 10) / 10,
    active_alerts: activeAlertCount,
  };
}

export function filterAndSortEmployees(
  employees: EmployeeSnapshot[],
  opts: {
    state: string;
    risk: string;
    search: string;
    sort: string;
    order: string;
  }
): EmployeeSnapshot[] {
  const q = opts.search.trim().toLowerCase();
  let list = employees.filter((e) => {
    if (opts.state !== "ALL" && isBurnoutState(opts.state)) {
      if (e.current_state !== opts.state) return false;
    }
    if (opts.risk !== "ALL" && isRiskLevel(opts.risk)) {
      if (e.risk_level !== opts.risk) return false;
    }
    if (q) {
      const name = (e.display_name ?? "").toLowerCase();
      const mail = (e.email ?? "").toLowerCase();
      if (!name.includes(q) && !mail.includes(q)) return false;
    }
    return true;
  });

  const dir = opts.order === "asc" ? 1 : -1;
  const sortKey = opts.sort;
  list = [...list].sort((a, b) => {
    if (sortKey === "risk_score") {
      return (a.risk_score - b.risk_score) * dir;
    }
    if (sortKey === "display_name") {
      const an = (a.display_name ?? a.email ?? "").toLowerCase();
      const bn = (b.display_name ?? b.email ?? "").toLowerCase();
      return an.localeCompare(bn) * dir;
    }
    if (sortKey === "current_state") {
      return a.current_state.localeCompare(b.current_state) * dir;
    }
    /* last_activity */
    const at = a.last_activity ? new Date(a.last_activity).getTime() : 0;
    const bt = b.last_activity ? new Date(b.last_activity).getTime() : 0;
    return (at - bt) * dir;
  });

  return list;
}
