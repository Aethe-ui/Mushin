import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { buildBurnoutWindow } from "@/lib/burnout-sync";
import { detectAdvancedPatterns } from "@/lib/burnout";
import type { BurnoutRiskScore, RiskLevel } from "@/types/performance";

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

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scoreDate = new Date().toISOString().slice(0, 10);
  const supabase = createClient();

  try {
    const { data: row, error } = await supabase
      .from("burnout_risk_scores")
      .select("*")
      .eq("user_id", user.id)
      .eq("score_date", scoreDate)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const { days, focusScores } = await buildBurnoutWindow(
      supabase,
      user.id,
      scoreDate
    );
    const patterns = detectAdvancedPatterns(days, focusScores);

    if (!row) {
      return NextResponse.json({
        score: null,
        patterns,
        suggestions: [] as string[],
        explanation: "",
      });
    }

    const score = mapScore(row as Record<string, unknown>);

    return NextResponse.json({
      score,
      patterns,
      suggestions: score.suggestions,
      explanation: score.explanation ?? "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load today";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
