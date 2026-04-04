import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import {
  computeFocusScore,
  computeFitnessScore,
  computeBalanceMultiplier,
  computePerformanceScore,
  detectBurnoutState,
  computeXP,
  computeLevel,
  generateExplanation,
} from "@/lib/performance";
import {
  computeBurnoutForDate,
  persistBurnoutRisk,
} from "@/lib/burnout-sync";
import type { DailyInput } from "@/types/performance";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let targetDate = new Date().toISOString().slice(0, 10);
  try {
    const b = await request.json();
    if (typeof b?.date === "string") targetDate = b.date;
  } catch {
    /* default to today */
  }

  const supabase = createClient();

  const { data: prevSnapRow } = await supabase
    .from("performance_snapshots")
    .select("xp_earned")
    .eq("user_id", user.id)
    .eq("snapshot_date", targetDate)
    .maybeSingle();

  const prevXPForDay = Number(prevSnapRow?.xp_earned ?? 0);

  const dayStart = `${targetDate}T00:00:00.000Z`;
  const dayEnd = `${targetDate}T23:59:59.999Z`;

  const { data: todaySessions } = await supabase
    .from("sessions")
    .select("duration, planned_duration, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  const focusMinutes = Math.round(
    (todaySessions ?? []).reduce((s, r) => s + (r.duration ?? 0), 0) / 60
  );
  const totalPlanned = (todaySessions ?? []).reduce(
    (s, r) => s + (r.planned_duration ?? 0),
    0
  );
  const completionRate =
    totalPlanned > 0
      ? Math.min(
          (todaySessions ?? []).reduce(
            (s, r) => s + (r.duration ?? 0),
            0
          ) / totalPlanned,
          1
        )
      : 0;

  const { data: workout } = await supabase
    .from("workout_logs")
    .select("duration_min, intensity")
    .eq("user_id", user.id)
    .eq("logged_date", targetDate)
    .maybeSingle();

  const { data: rest } = await supabase
    .from("rest_logs")
    .select("hours")
    .eq("user_id", user.id)
    .eq("logged_date", targetDate)
    .maybeSingle();

  const restHours = rest?.hours != null ? Number(rest.hours) : 7;

  const todayInput: DailyInput = {
    date: targetDate,
    focus_minutes: focusMinutes,
    focus_sessions: (todaySessions ?? []).length,
    focus_completion_rate: completionRate,
    workout_minutes: workout?.duration_min ?? 0,
    workout_intensity:
      (workout?.intensity as DailyInput["workout_intensity"]) ?? "none",
    rest_hours: restHours,
  };

  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: recentSnapshots } = await supabase
    .from("performance_snapshots")
    .select("snapshot_date, focus_score, fitness_score")
    .eq("user_id", user.id)
    .gte("snapshot_date", sevenDaysAgoStr)
    .lt("snapshot_date", targetDate)
    .order("snapshot_date", { ascending: true });

  const { data: recentRest } = await supabase
    .from("rest_logs")
    .select("logged_date, hours")
    .eq("user_id", user.id)
    .gte("logged_date", sevenDaysAgoStr)
    .lt("logged_date", targetDate);

  const { data: recentWorkouts } = await supabase
    .from("workout_logs")
    .select("logged_date, duration_min, intensity")
    .eq("user_id", user.id)
    .gte("logged_date", sevenDaysAgoStr)
    .lt("logged_date", targetDate);

  const recentDays: DailyInput[] = (recentSnapshots ?? []).map((s) => {
    const r = (recentRest ?? []).find((x) => x.logged_date === s.snapshot_date);
    const w = (recentWorkouts ?? []).find(
      (x) => x.logged_date === s.snapshot_date
    );
    return {
      date: s.snapshot_date,
      focus_minutes: Math.round((Number(s.focus_score) / 80) * 120),
      focus_sessions: 1,
      focus_completion_rate: 0.8,
      workout_minutes: w?.duration_min ?? 0,
      workout_intensity:
        (w?.intensity as DailyInput["workout_intensity"]) ?? "none",
      rest_hours: r?.hours != null ? Number(r.hours) : 7,
    };
  });

  const focusScore = computeFocusScore(todayInput);
  const fitnessScore = computeFitnessScore(todayInput);
  const balanceMult = computeBalanceMultiplier(todayInput.rest_hours);
  const perfScore = computePerformanceScore(
    focusScore,
    fitnessScore,
    balanceMult
  );
  const burnoutState = detectBurnoutState(
    [...recentDays, todayInput],
    todayInput.rest_hours
  );

  const { result: burnResult, previousLevel: prevRiskLevel } =
    await computeBurnoutForDate(supabase, user.id, targetDate, {
      input: todayInput,
      performanceScore: perfScore,
      focusScore: focusScore,
    });

  const xpEarned = computeXP(perfScore, burnoutState, burnResult.xpPenaltyMult);
  const explanation = generateExplanation({
    input: todayInput,
    focusScore,
    fitnessScore,
    balanceMult,
    performanceScore: perfScore,
    burnoutState,
    xpEarned,
    recentDays,
  });

  const { data: snapshot, error: snapErr } = await supabase
    .from("performance_snapshots")
    .upsert(
      {
        user_id: user.id,
        snapshot_date: targetDate,
        focus_score: focusScore,
        fitness_score: fitnessScore,
        balance_multiplier: balanceMult,
        performance_score: perfScore,
        burnout_state: burnoutState,
        xp_earned: xpEarned,
        explanation,
      },
      { onConflict: "user_id,snapshot_date" }
    )
    .select()
    .single();

  if (snapErr) {
    return NextResponse.json({ error: snapErr.message }, { status: 500 });
  }

  const { data: existingXP } = await supabase
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", user.id)
    .maybeSingle();

  const baseTotal = Number(existingXP?.total_xp ?? 0);
  const newTotal = Math.max(0, baseTotal - prevXPForDay + xpEarned);
  const { level } = computeLevel(newTotal);

  await supabase.from("user_xp").upsert(
    {
      user_id: user.id,
      total_xp: newTotal,
      level,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  try {
    await persistBurnoutRisk(
      supabase,
      user.id,
      targetDate,
      burnResult,
      prevRiskLevel
    );
  } catch {
    /* burnout_risk_scores table may be missing until migration is applied */
  }

  const { xpToNext } = computeLevel(newTotal);
  return NextResponse.json({
    snapshot,
    totalXP: newTotal,
    level,
    xpToNext,
  });
}
