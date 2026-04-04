import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { addDays } from "@/lib/burnout-sync";
import type {
  BurnoutHistoryResponse,
  BurnoutRiskEvent,
  BurnoutRiskScore,
  RiskLevel,
} from "@/types/performance";

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function parseSuggestions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

function mapScore(raw: Record<string, unknown>): BurnoutRiskScore {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    score_date: String(raw.score_date),
    risk_score: Number(raw.risk_score),
    workload_score: Number(raw.workload_score),
    recovery_score: Number(raw.recovery_score),
    consistency_score: Number(raw.consistency_score),
    risk_level: raw.risk_level as RiskLevel,
    explanation:
      raw.explanation == null ? null : String(raw.explanation),
    suggestions: parseSuggestions(raw.suggestions),
    xp_penalty_mult: Number(raw.xp_penalty_mult),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

function mapEvent(raw: Record<string, unknown>): BurnoutRiskEvent {
  const tf = raw.trigger_facts;
  let trigger_facts: string[] = [];
  if (Array.isArray(tf)) trigger_facts = tf as string[];
  else if (typeof tf === "string") {
    try {
      trigger_facts = JSON.parse(tf) as string[];
    } catch {
      trigger_facts = [];
    }
  }
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    event_date: String(raw.event_date),
    from_level: raw.from_level as RiskLevel,
    to_level: raw.to_level as RiskLevel,
    trigger_facts,
    created_at: String(raw.created_at),
  };
}

function trendFromScores(scores: BurnoutRiskScore[]): BurnoutHistoryResponse["trend"] {
  if (scores.length < 4) return "STABLE";
  const vals = scores.map((s) => Number(s.risk_score));
  const third = Math.max(1, Math.floor(vals.length / 3));
  const first = mean(vals.slice(0, third));
  const last = mean(vals.slice(-third));
  const diff = last - first;
  if (diff < -5) return "IMPROVING";
  if (diff > 5) return "WORSENING";
  return "STABLE";
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = Math.min(
    90,
    Math.max(1, Number(daysParam ?? 14) || 14)
  );

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = addDays(endDate, -(days - 1));

  const supabase = createClient();

  try {
    const { data: scoreRows, error: sErr } = await supabase
      .from("burnout_risk_scores")
      .select("*")
      .eq("user_id", user.id)
      .gte("score_date", startDate)
      .lte("score_date", endDate)
      .order("score_date", { ascending: true });

    if (sErr) throw new Error(sErr.message);

    const { data: eventRows, error: eErr } = await supabase
      .from("burnout_risk_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("event_date", startDate)
      .lte("event_date", endDate)
      .order("event_date", { ascending: true });

    if (eErr) throw new Error(eErr.message);

    const scores = (scoreRows ?? []).map((r) =>
      mapScore(r as Record<string, unknown>)
    );
    const events = (eventRows ?? []).map((r) =>
      mapEvent(r as Record<string, unknown>)
    );

    const currentLevel: RiskLevel =
      scores.length > 0
        ? scores[scores.length - 1].risk_level
        : "LOW";

    const body: BurnoutHistoryResponse = {
      scores,
      events,
      currentLevel,
      trend: trendFromScores(scores),
    };

    return NextResponse.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load history";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
