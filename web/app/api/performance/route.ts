import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { computeLevel } from "@/lib/performance";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(
    30,
    Math.max(1, parseInt(searchParams.get("days") ?? "7", 10))
  );

  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const fromStr = from.toISOString().slice(0, 10);

  const { data: snapshots } = await supabase
    .from("performance_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .gte("snapshot_date", fromStr)
    .order("snapshot_date", { ascending: false });

  const streakFrom = new Date();
  streakFrom.setDate(streakFrom.getDate() - 365);
  const streakFromStr = streakFrom.toISOString().slice(0, 10);

  const { data: streakRows } = await supabase
    .from("performance_snapshots")
    .select("snapshot_date, performance_score")
    .eq("user_id", user.id)
    .gte("snapshot_date", streakFromStr);

  const streakSet = new Set(
    (streakRows ?? [])
      .filter((r) => Number(r.performance_score) > 0)
      .map((r) => r.snapshot_date)
  );

  let streakDays = 0;
  const check = new Date();
  for (let i = 0; i < 365; i++) {
    const d = check.toISOString().slice(0, 10);
    check.setDate(check.getDate() - 1);
    if (streakSet.has(d)) streakDays++;
    else break;
  }

  const { data: xpRow } = await supabase
    .from("user_xp")
    .select("total_xp, level")
    .eq("user_id", user.id)
    .maybeSingle();

  const totalXP = Number(xpRow?.total_xp ?? 0);
  const { level, xpToNext } = computeLevel(totalXP);

  const todaySnap =
    (snapshots ?? []).find((s) => s.snapshot_date === today) ?? null;

  return NextResponse.json({
    today: todaySnap,
    last7Days: snapshots ?? [],
    totalXP,
    level,
    xpToNextLevel: xpToNext,
    streakDays,
  });
}
