import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth";
import {
  assertEmployerStaffForOrg,
  buildTeamSummary,
  fetchStreakDaysByUser,
  fetchUserEmailsById,
  filterAndSortEmployees,
  parseOrgIdParam,
} from "@/lib/employer-server";
import type { EmployeeSnapshot } from "@/types/employer";
import type { BurnoutState, RiskLevel } from "@/types/performance";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = parseOrgIdParam(request);
  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "risk_score";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const state = searchParams.get("state") ?? "ALL";
  const risk = searchParams.get("risk") ?? "ALL";
  const search = searchParams.get("search") ?? "";

  const allowedSort = new Set([
    "risk_score",
    "last_activity",
    "display_name",
    "current_state",
  ]);
  if (!allowedSort.has(sort)) {
    return NextResponse.json({ error: "invalid sort" }, { status: 400 });
  }

  const supabase = createClient();
  const allowed = await assertEmployerStaffForOrg(supabase, user.id, orgId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let svc;
  try {
    svc = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  const { data: members, error: memErr } = await svc
    .from("org_members")
    .select("user_id, display_name, joined_at")
    .eq("org_id", orgId)
    .eq("role", "member");

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  const memberRows = members ?? [];
  const userIds = memberRows.map((m) => String(m.user_id));

  const emailMap = await fetchUserEmailsById(svc, userIds);
  const streakMap = await fetchStreakDaysByUser(svc, userIds);

  const { data: brsRows } = await svc
    .from("burnout_risk_scores")
    .select(
      "user_id, score_date, risk_score, risk_level, workload_score, recovery_score, consistency_score"
    )
    .in("user_id", userIds)
    .order("score_date", { ascending: false });

  const latestBrs = new Map<string, Record<string, unknown>>();
  for (const r of brsRows ?? []) {
    const uid = String(r.user_id);
    if (!latestBrs.has(uid)) {
      latestBrs.set(uid, r as Record<string, unknown>);
    }
  }

  const { data: psRows } = await svc
    .from("performance_snapshots")
    .select("user_id, snapshot_date, burnout_state")
    .in("user_id", userIds)
    .order("snapshot_date", { ascending: false });

  const latestPs = new Map<string, BurnoutState>();
  for (const r of psRows ?? []) {
    const uid = String(r.user_id);
    if (!latestPs.has(uid)) {
      latestPs.set(uid, r.burnout_state as BurnoutState);
    }
  }

  const { data: sessRows } = await svc
    .from("sessions")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  const lastAct = new Map<string, string>();
  for (const r of sessRows ?? []) {
    const uid = String(r.user_id);
    if (!lastAct.has(uid)) {
      lastAct.set(uid, String(r.created_at));
    }
  }

  const { count: activeAlertCount } = await svc
    .from("employer_alerts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active");

  const employeesBase: EmployeeSnapshot[] = memberRows.map((m) => {
    const uid = String(m.user_id);
    const brs = latestBrs.get(uid);
    const risk_level = (brs?.risk_level as RiskLevel) ?? "LOW";
    const risk_score = brs ? Number(brs.risk_score) : 0;
    return {
      user_id: uid,
      display_name: (m.display_name as string | null) ?? null,
      email: emailMap.get(uid) ?? null,
      current_state: latestPs.get(uid) ?? "NORMAL",
      risk_level,
      risk_score,
      last_activity: lastAct.get(uid) ?? null,
      workload_score: brs ? Number(brs.workload_score) : 0,
      recovery_score: brs ? Number(brs.recovery_score) : 0,
      consistency_score: brs ? Number(brs.consistency_score) : 0,
      streak_days: streakMap.get(uid) ?? 0,
    };
  });

  const team = buildTeamSummary(employeesBase, activeAlertCount ?? 0);

  const employees = filterAndSortEmployees(employeesBase, {
    state,
    risk,
    search,
    sort,
    order,
  });

  return NextResponse.json({ employees, team });
}
