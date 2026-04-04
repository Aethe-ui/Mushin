import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeBurnoutRisk,
  type BurnoutRiskResult,
} from "@/lib/burnout";
import {
  computeLevel,
  computeXP,
  burnoutStateXPMultiplier,
} from "@/lib/performance";
import type {
  BurnoutRiskEvent,
  BurnoutRiskScore,
  BurnoutState,
  DailyInput,
  RiskLevel,
} from "@/types/performance";

export function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function dateRangeInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  let c = start;
  while (c <= end) {
    out.push(c);
    c = addDays(c, 1);
  }
  return out;
}

const PATTERN_FACTS: Record<string, string> = {
  CONSECUTIVE_HIGH_FOCUS: "≥3 consecutive days with focus score above 75",
  DECLINING_REST: "Rest hours decreased for 3+ consecutive days",
  RISING_WORKLOAD: "Workload trend increasing over the last 5 days",
  NO_RECOVERY_DAY: "7 days with workouts logged but no day with ≥8h rest",
  BOOM_BUST: "Focus score swung more than 30 points between consecutive days",
};

export type BurnoutWindow = {
  days: DailyInput[];
  perfScores: number[];
  focusScores: number[];
};

export async function buildBurnoutWindow(
  supabase: SupabaseClient,
  userId: string,
  endDate: string,
  todayOverride?: {
    input: DailyInput;
    performanceScore: number;
    focusScore: number;
  }
): Promise<BurnoutWindow> {
  const startDate = addDays(endDate, -13);
  const dates = dateRangeInclusive(startDate, endDate);

  const { data: snapshots } = await supabase
    .from("performance_snapshots")
    .select(
      "snapshot_date, focus_score, fitness_score, performance_score"
    )
    .eq("user_id", userId)
    .gte("snapshot_date", startDate)
    .lte("snapshot_date", endDate);

  const { data: rests } = await supabase
    .from("rest_logs")
    .select("logged_date, hours")
    .eq("user_id", userId)
    .gte("logged_date", startDate)
    .lte("logged_date", endDate);

  const { data: workouts } = await supabase
    .from("workout_logs")
    .select("logged_date, duration_min, intensity")
    .eq("user_id", userId)
    .gte("logged_date", startDate)
    .lte("logged_date", endDate);

  const snapList = snapshots ?? [];
  const restList = rests ?? [];
  const woList = workouts ?? [];

  const days: DailyInput[] = dates.map((date) => {
    if (date === endDate && todayOverride) {
      return todayOverride.input;
    }
    const snap = snapList.find((s) => s.snapshot_date === date);
    const r = restList.find((x) => x.logged_date === date);
    const w = woList.find((x) => x.logged_date === date);
    return {
      date,
      focus_minutes: snap
        ? Math.round((Number(snap.focus_score) / 80) * 120)
        : 0,
      focus_sessions: snap ? 1 : 0,
      focus_completion_rate: 0.8,
      workout_minutes: w?.duration_min ?? 0,
      workout_intensity:
        (w?.intensity as DailyInput["workout_intensity"]) ?? "none",
      rest_hours: r?.hours != null ? Number(r.hours) : 7,
    };
  });

  const perfScores = dates.map((date) => {
    if (date === endDate && todayOverride) {
      return todayOverride.performanceScore;
    }
    const snap = snapList.find((s) => s.snapshot_date === date);
    return snap ? Number(snap.performance_score) : 0;
  });

  const focusScores = dates.map((date) => {
    if (date === endDate && todayOverride) {
      return todayOverride.focusScore;
    }
    const snap = snapList.find((s) => s.snapshot_date === date);
    return snap ? Number(snap.focus_score) : 0;
  });

  return { days, perfScores, focusScores };
}

export async function loadPreviousBurnoutDay(
  supabase: SupabaseClient,
  userId: string,
  scoreDate: string
): Promise<{ risk_level: string; risk_score: number } | null> {
  const yesterday = addDays(scoreDate, -1);
  const { data } = await supabase
    .from("burnout_risk_scores")
    .select("risk_level, risk_score")
    .eq("user_id", userId)
    .eq("score_date", yesterday)
    .maybeSingle();
  if (!data) return null;
  return {
    risk_level: String(data.risk_level),
    risk_score: Number(data.risk_score),
  };
}

function mapRiskRow(raw: Record<string, unknown>): BurnoutRiskScore {
  const sug = raw.suggestions;
  const suggestions = Array.isArray(sug)
    ? (sug as string[])
    : typeof sug === "string"
      ? JSON.parse(sug) as string[]
      : [];
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    score_date: String(raw.score_date),
    risk_score: Number(raw.risk_score),
    workload_score: Number(raw.workload_score),
    recovery_score: Number(raw.recovery_score),
    consistency_score: Number(raw.consistency_score),
    risk_level: raw.risk_level as BurnoutRiskScore["risk_level"],
    explanation:
      raw.explanation === null || raw.explanation === undefined
        ? null
        : String(raw.explanation),
    suggestions,
    xp_penalty_mult: Number(raw.xp_penalty_mult),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

function mapEventRow(raw: Record<string, unknown>): BurnoutRiskEvent {
  const tf = raw.trigger_facts;
  const trigger_facts = Array.isArray(tf)
    ? (tf as string[])
    : typeof tf === "string"
      ? JSON.parse(tf) as string[]
      : [];
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    event_date: String(raw.event_date),
    from_level: raw.from_level as BurnoutRiskEvent["from_level"],
    to_level: raw.to_level as BurnoutRiskEvent["to_level"],
    trigger_facts,
    created_at: String(raw.created_at),
  };
}

export async function computeBurnoutForDate(
  supabase: SupabaseClient,
  userId: string,
  scoreDate: string,
  todayOverride?: {
    input: DailyInput;
    performanceScore: number;
    focusScore: number;
  }
): Promise<{
  result: BurnoutRiskResult;
  previousLevel: RiskLevel | null;
}> {
  const prev = await loadPreviousBurnoutDay(supabase, userId, scoreDate);
  const previousLevel = (prev?.risk_level as RiskLevel | null) ?? null;
  const previousRiskScore =
    prev?.risk_score != null ? Number(prev.risk_score) : null;

  const { days, perfScores, focusScores } = await buildBurnoutWindow(
    supabase,
    userId,
    scoreDate,
    todayOverride
  );

  const result = computeBurnoutRisk(
    days,
    perfScores,
    focusScores,
    previousLevel,
    previousRiskScore
  );

  return { result, previousLevel };
}

export async function persistBurnoutRisk(
  supabase: SupabaseClient,
  userId: string,
  scoreDate: string,
  result: BurnoutRiskResult,
  previousLevel: RiskLevel | null
): Promise<{
  row: BurnoutRiskScore;
  escalationEvent: BurnoutRiskEvent | null;
}> {
  const { data: todayExisting } = await supabase
    .from("burnout_risk_scores")
    .select("risk_level")
    .eq("user_id", userId)
    .eq("score_date", scoreDate)
    .maybeSingle();

  const priorToday = todayExisting?.risk_level as RiskLevel | undefined;
  const fromForEvent = (priorToday ?? previousLevel ?? "LOW") as BurnoutRiskScore["risk_level"];

  const { data: upserted, error } = await supabase
    .from("burnout_risk_scores")
    .upsert(
      {
        user_id: userId,
        score_date: scoreDate,
        risk_score: result.riskScore,
        workload_score: result.workloadScore,
        recovery_score: result.recoveryScore,
        consistency_score: result.consistencyScore,
        risk_level: result.riskLevel,
        explanation: result.explanation,
        suggestions: result.suggestions,
        xp_penalty_mult: result.xpPenaltyMult,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,score_date" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  const row = mapRiskRow(upserted as Record<string, unknown>);

  let escalationEvent: BurnoutRiskEvent | null = null;
  if (fromForEvent !== result.riskLevel) {
    const trigger_facts = result.detectedPatterns.map(
      (p) => PATTERN_FACTS[p] ?? p
    );
    const { data: ev, error: evErr } = await supabase
      .from("burnout_risk_events")
      .insert({
        user_id: userId,
        event_date: scoreDate,
        from_level: fromForEvent,
        to_level: result.riskLevel,
        trigger_facts,
      })
      .select()
      .single();
    if (!evErr && ev) {
      escalationEvent = mapEventRow(ev as Record<string, unknown>);
    }
  }

  return { row, escalationEvent };
}

export async function reconcileSnapshotXpForRisk(
  supabase: SupabaseClient,
  userId: string,
  scoreDate: string,
  riskPenaltyMult: number
): Promise<void> {
  const { data: snap } = await supabase
    .from("performance_snapshots")
    .select("performance_score, burnout_state, xp_earned")
    .eq("user_id", userId)
    .eq("snapshot_date", scoreDate)
    .maybeSingle();

  if (!snap) return;

  const perf = Number(snap.performance_score);
  const state = snap.burnout_state as BurnoutState;
  const newXp = computeXP(perf, state, riskPenaltyMult);
  const oldXp = Number(snap.xp_earned ?? 0);
  if (newXp === oldXp) return;

  const { data: ux } = await supabase
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();

  const base = Number(ux?.total_xp ?? 0);
  const newTotal = Math.max(0, base - oldXp + newXp);
  const { level } = computeLevel(newTotal);

  await supabase
    .from("performance_snapshots")
    .update({ xp_earned: newXp })
    .eq("user_id", userId)
    .eq("snapshot_date", scoreDate);

  await supabase.from("user_xp").upsert(
    {
      user_id: userId,
      total_xp: newTotal,
      level,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function runBurnoutCompute(
  supabase: SupabaseClient,
  userId: string,
  scoreDate: string,
  options?: {
    todayOverride?: {
      input: DailyInput;
      performanceScore: number;
      focusScore: number;
    };
    reconcileSnapshotXp?: boolean;
  }
): Promise<{
  result: BurnoutRiskResult;
  riskScore: BurnoutRiskScore;
  escalationEvent: BurnoutRiskEvent | null;
  todayXPMultiplier: number;
}> {
  const { result, previousLevel } = await computeBurnoutForDate(
    supabase,
    userId,
    scoreDate,
    options?.todayOverride
  );

  const { row, escalationEvent } = await persistBurnoutRisk(
    supabase,
    userId,
    scoreDate,
    result,
    previousLevel
  );

  if (options?.reconcileSnapshotXp) {
    await reconcileSnapshotXpForRisk(
      supabase,
      userId,
      scoreDate,
      result.xpPenaltyMult
    );
  }

  const { data: snap } = await supabase
    .from("performance_snapshots")
    .select("burnout_state")
    .eq("user_id", userId)
    .eq("snapshot_date", scoreDate)
    .maybeSingle();

  const state = (snap?.burnout_state as BurnoutState) ?? "NORMAL";
  const todayXPMultiplier =
    burnoutStateXPMultiplier(state) * result.xpPenaltyMult;

  return {
    result,
    riskScore: row,
    escalationEvent,
    todayXPMultiplier,
  };
}
