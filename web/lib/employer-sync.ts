import type { SupabaseClient } from "@supabase/supabase-js";
import type { BurnoutRiskResult } from "@/lib/burnout";
import type { RiskLevel } from "@/types/performance";

const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export async function getOrgIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.org_id as string;
}

async function upsertActiveHighRiskAlert(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  result: BurnoutRiskResult
): Promise<void> {
  const alert_type: "WARNING" | "CRITICAL" =
    result.riskLevel === "CRITICAL" ? "CRITICAL" : "WARNING";

  const { data: existing } = await supabase
    .from("employer_alerts")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const base = {
    org_id: orgId,
    user_id: userId,
    alert_type,
    risk_level: result.riskLevel,
    message: result.explanation,
    status: "active" as const,
    resolved_at: null as string | null,
  };

  if (existing?.id) {
    await supabase.from("employer_alerts").update(base).eq("id", existing.id);
  } else {
    await supabase.from("employer_alerts").insert(base);
  }
}

export async function writeAccountabilityLog(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  result: BurnoutRiskResult,
  prevLevel: RiskLevel | null,
  scoreDate: string
): Promise<void> {
  const entries: Record<string, unknown>[] = [];

  entries.push({
    org_id: orgId,
    user_id: userId,
    log_date: scoreDate,
    event_type: "DAILY_SCORE_COMPUTED",
    description: `Risk score ${Math.round(result.riskScore)}/100 — level: ${result.riskLevel}.`,
    metadata: {
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      workload: result.workloadScore,
      recovery: result.recoveryScore,
      patterns: result.detectedPatterns,
    },
  });

  if (prevLevel !== null && result.riskLevel !== prevLevel) {
    const escalating = RISK_ORDER[result.riskLevel] > RISK_ORDER[prevLevel];
    entries.push({
      org_id: orgId,
      user_id: userId,
      log_date: scoreDate,
      event_type: escalating ? "RISK_ESCALATED" : "RISK_REDUCED",
      description: `Burnout risk ${escalating ? "escalated" : "reduced"} from ${prevLevel} → ${result.riskLevel}. ${result.explanation}`,
      metadata: {
        from: prevLevel,
        to: result.riskLevel,
        patterns: result.detectedPatterns,
      },
    });
  }

  if (result.riskLevel === "HIGH" || result.riskLevel === "CRITICAL") {
    await upsertActiveHighRiskAlert(supabase, orgId, userId, result);
  }

  if (entries.length > 0) {
    const { error } = await supabase.from("accountability_logs").insert(entries);
    if (error) {
      console.error("accountability_logs insert:", error.message);
    }
  }
}
