import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth";
import {
  assertEmployerStaffForOrg,
  fetchStreakDaysByUser,
  fetchUserEmailsById,
  parseOrgIdParam,
} from "@/lib/employer-server";
import { parseUuidOrNull } from "@/lib/utils";
import type {
  AccountabilityEntry,
  BurnoutPoint,
  DailyEmployeeLog,
  EmployeeDetail,
  StateTransition,
} from "@/types/employer";
import type { BurnoutState, RiskLevel } from "@/types/performance";

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetId = parseUuidOrNull(params.userId);
  if (!targetId) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const orgId = parseOrgIdParam(request);
  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(
    30,
    Math.max(7, parseInt(searchParams.get("days") ?? "7", 10))
  );

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

  const { data: membership } = await svc
    .from("org_members")
    .select("user_id, display_name, role")
    .eq("org_id", orgId)
    .eq("user_id", targetId)
    .eq("role", "member")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Employee not in org" }, { status: 404 });
  }

  const end = new Date().toISOString().slice(0, 10);
  const start = addDays(end, -(days - 1));

  const emailMap = await fetchUserEmailsById(svc, [targetId]);
  const streakMap = await fetchStreakDaysByUser(svc, [targetId]);

  const { data: brsHist } = await svc
    .from("burnout_risk_scores")
    .select(
      "score_date, risk_score, risk_level, workload_score, recovery_score, consistency_score"
    )
    .eq("user_id", targetId)
    .gte("score_date", start)
    .lte("score_date", end)
    .order("score_date", { ascending: true });

  const burnout_history: BurnoutPoint[] = (brsHist ?? []).map((r) => ({
    date: String(r.score_date),
    risk_score: Number(r.risk_score),
    risk_level: r.risk_level as RiskLevel,
  }));

  const latestBrs = brsHist?.length
    ? brsHist[brsHist.length - 1]
    : null;

  const { data: psRows } = await svc
    .from("performance_snapshots")
    .select(
      "snapshot_date, focus_score, fitness_score, performance_score, burnout_state"
    )
    .eq("user_id", targetId)
    .gte("snapshot_date", start)
    .lte("snapshot_date", end)
    .order("snapshot_date", { ascending: true });

  const { data: woRows } = await svc
    .from("workout_logs")
    .select("logged_date, duration_min")
    .eq("user_id", targetId)
    .gte("logged_date", start)
    .lte("logged_date", end);

  const { data: restRows } = await svc
    .from("rest_logs")
    .select("logged_date, hours")
    .eq("user_id", targetId)
    .gte("logged_date", start)
    .lte("logged_date", end);

  const { data: evRows } = await svc
    .from("burnout_risk_events")
    .select("event_date, from_level, to_level")
    .eq("user_id", targetId)
    .gte("event_date", start)
    .lte("event_date", end)
    .order("event_date", { ascending: true });

  const state_transitions: StateTransition[] = (evRows ?? []).map((r) => ({
    date: String(r.event_date),
    from_state: String(r.from_level),
    to_state: String(r.to_level),
  }));

  const { data: acctRows } = await svc
    .from("accountability_logs")
    .select("id, log_date, event_type, description, metadata, created_at")
    .eq("org_id", orgId)
    .eq("user_id", targetId)
    .order("created_at", { ascending: false })
    .limit(200);

  const accountability: AccountabilityEntry[] = (acctRows ?? []).map((r) => ({
    id: String(r.id),
    log_date: String(r.log_date),
    event_type: String(r.event_type),
    description: String(r.description),
    metadata:
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as Record<string, unknown>)
        : {},
    created_at: String(r.created_at),
  }));

  const dateKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    dateKeys.push(addDays(start, i));
  }

  const snapshots_7d: DailyEmployeeLog[] = dateKeys.map((date) => {
    const ps = (psRows ?? []).find((p) => p.snapshot_date === date);
    const w = (woRows ?? []).find((x) => x.logged_date === date);
    const rest = (restRows ?? []).find((x) => x.logged_date === date);
    return {
      date,
      focus_score: ps ? Number(ps.focus_score) : null,
      fitness_score: ps ? Number(ps.fitness_score) : null,
      performance_score: ps ? Number(ps.performance_score) : null,
      burnout_state: ps ? (ps.burnout_state as BurnoutState) : null,
      workout_minutes: w ? Number(w.duration_min) : 0,
      rest_hours: rest ? Number(rest.hours) : 0,
    };
  });

  const { data: latestPsRow } = await svc
    .from("performance_snapshots")
    .select("burnout_state")
    .eq("user_id", targetId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sessRow } = await svc
    .from("sessions")
    .select("created_at")
    .eq("user_id", targetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const patternsEntry = accountability.find(
    (a) => a.event_type === "DAILY_SCORE_COMPUTED"
  );
  const meta = patternsEntry?.metadata ?? {};
  const rawPatterns = meta.patterns;
  const detected_patterns = Array.isArray(rawPatterns)
    ? (rawPatterns as unknown[]).map(String)
    : [];

  const detail: EmployeeDetail = {
    user_id: targetId,
    display_name: (membership.display_name as string | null) ?? null,
    email: emailMap.get(targetId) ?? null,
    current_state: (latestPsRow?.burnout_state as BurnoutState) ?? "NORMAL",
    risk_level: latestBrs ? (latestBrs.risk_level as RiskLevel) : "LOW",
    risk_score: latestBrs ? Number(latestBrs.risk_score) : 0,
    last_activity: sessRow?.created_at ? String(sessRow.created_at) : null,
    workload_score: latestBrs ? Number(latestBrs.workload_score) : 0,
    recovery_score: latestBrs ? Number(latestBrs.recovery_score) : 0,
    consistency_score: latestBrs ? Number(latestBrs.consistency_score) : 0,
    streak_days: streakMap.get(targetId) ?? 0,
    snapshots_7d,
    burnout_history,
    state_transitions,
    accountability,
    detected_patterns,
  };

  return NextResponse.json(detail);
}
