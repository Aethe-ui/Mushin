import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient();

  const today = new Date();
  const dates: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const fromDate = dates[0];

  const [snapRes, workoutRes, restRes] = await Promise.all([
    supabase
      .from("performance_snapshots")
      .select(
        "snapshot_date, focus_score, fitness_score, balance_multiplier, performance_score, burnout_state, xp_earned"
      )
      .eq("user_id", user.id)
      .gte("snapshot_date", fromDate)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("workout_logs")
      .select("logged_date, duration_min, intensity")
      .eq("user_id", user.id)
      .gte("logged_date", fromDate)
      .order("logged_date", { ascending: true }),
    supabase
      .from("rest_logs")
      .select("logged_date, hours")
      .eq("user_id", user.id)
      .gte("logged_date", fromDate)
      .order("logged_date", { ascending: true }),
  ]);

  if (snapRes.error) {
    return NextResponse.json({ error: snapRes.error.message }, { status: 500 });
  }
  if (workoutRes.error) {
    return NextResponse.json({ error: workoutRes.error.message }, { status: 500 });
  }
  if (restRes.error) {
    return NextResponse.json({ error: restRes.error.message }, { status: 500 });
  }

  const snapshots = snapRes.data ?? [];
  const workouts = workoutRes.data ?? [];
  const rests = restRes.data ?? [];

  const logs = dates.map((date) => {
    const snap = snapshots.find((s) => s.snapshot_date === date);
    const workout = workouts.find((w) => w.logged_date === date);
    const rest = rests.find((r) => r.logged_date === date);
    return {
      date,
      focus_score: snap ? Number(snap.focus_score) : null,
      fitness_score: snap ? Number(snap.fitness_score) : null,
      performance_score: snap ? Number(snap.performance_score) : null,
      burnout_state: snap?.burnout_state ?? null,
      workout_minutes: workout ? Number(workout.duration_min) : 0,
      rest_hours: rest ? Number(rest.hours) : 0,
      rest_minutes: rest ? Number(rest.hours) * 60 : 0,
      has_data: !!snap,
    };
  });

  const patterns: string[] = [];

  let overworkStreak = 0;
  for (const log of logs) {
    if (
      log.workout_minutes > 0 &&
      log.rest_minutes > 0 &&
      log.workout_minutes > 2 * log.rest_minutes
    ) {
      overworkStreak++;
    } else {
      overworkStreak = 0;
    }
    if (overworkStreak >= 3) {
      patterns.push("OVERWORK");
      break;
    }
  }

  let declineStreak = 0;
  const restLogs = logs.filter((l) => l.rest_hours > 0);
  for (let i = 1; i < restLogs.length; i++) {
    if (restLogs[i].rest_hours < restLogs[i - 1].rest_hours) {
      declineStreak++;
      if (declineStreak >= 2) {
        patterns.push("DECREASING_RECOVERY");
        break;
      }
    } else {
      declineStreak = 0;
    }
  }

  const transitions: string[] = logs
    .filter((l) => l.burnout_state !== null)
    .map((l) => l.burnout_state as string);

  const transitionMarkers: { date: string; from: string; to: string }[] = [];
  const stateHistory = logs.filter((l) => l.burnout_state);
  for (let i = 1; i < stateHistory.length; i++) {
    if (stateHistory[i].burnout_state !== stateHistory[i - 1].burnout_state) {
      transitionMarkers.push({
        date: stateHistory[i].date,
        from: stateHistory[i - 1].burnout_state!,
        to: stateHistory[i].burnout_state!,
      });
    }
  }

  return NextResponse.json({
    logs,
    patterns,
    transitions,
    transitionMarkers,
    dateRange: { from: dates[0], to: dates[4] },
  });
}
