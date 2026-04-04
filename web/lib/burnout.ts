import type { DailyInput, RiskLevel } from "@/types/performance";

export interface BurnoutRiskResult {
  riskScore: number;
  workloadScore: number;
  recoveryScore: number;
  consistencyScore: number;
  riskLevel: RiskLevel;
  detectedPatterns: string[];
  explanation: string;
  suggestions: string[];
  xpPenaltyMult: number;
}

const WORKLOAD_WEIGHT = 0.4;
const RECOVERY_WEIGHT = 0.35;
const CONSISTENCY_WEIGHT = 0.25;

const LEVEL_ORDER: RiskLevel[] = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
];

const XP_PENALTY: Record<RiskLevel, number> = {
  LOW: 1.0,
  MODERATE: 0.85,
  HIGH: 0.6,
  CRITICAL: 0.3,
};

export const PATTERN_RISK: Record<string, number> = {
  CONSECUTIVE_HIGH_FOCUS: 12,
  DECLINING_REST: 10,
  RISING_WORKLOAD: 8,
  NO_RECOVERY_DAY: 15,
  BOOM_BUST: 7,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

/** Workload risk 0–100 from last up to 7 days (high = risky). */
export function computeWorkloadScore(days: DailyInput[]): number {
  const slice = days.slice(-7);
  if (slice.length === 0) return 0;
  const daily = slice.map((d) => {
    const f = d.focus_minutes / 120;
    const w = d.workout_minutes / 60;
    return ((f + w) / 2) * 100;
  });
  return clamp(mean(daily), 0, 100);
}

/** Recovery risk 0–100 (high = risky). */
export function computeRecoveryScore(days: DailyInput[]): number {
  const slice = days.slice(-7);
  if (slice.length === 0) return 0;
  const adequacy = slice.map((d) =>
    clamp((d.rest_hours / 9) * 100, 0, 100)
  );
  return clamp(100 - mean(adequacy), 0, 100);
}

/** Consistency risk from performance score variance (high = risky). */
export function computeConsistencyScore(perfScores: number[]): number {
  const slice = perfScores.slice(-7);
  if (slice.length < 2) return 0;
  const sd = stdDev(slice);
  return clamp((sd / 50) * 100, 0, 100);
}

function linearRegressionSlope(y: number[]): number {
  const n = y.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function dailyWorkloadIndex(d: DailyInput): number {
  const f = d.focus_minutes / 120;
  const w = d.workout_minutes / 60;
  return ((f + w) / 2) * 100;
}

export function detectAdvancedPatterns(
  days: DailyInput[],
  focusScores: number[]
): string[] {
  const patterns: string[] = [];
  const n = days.length;

  if (n >= 3) {
    let run = 0;
    for (let i = n - 1; i >= 0; i--) {
      const fs = focusScores[i] ?? 0;
      if (fs > 75) run++;
      else break;
    }
    if (run >= 3) patterns.push("CONSECUTIVE_HIGH_FOCUS");
  }

  if (n >= 4) {
    let dec = 0;
    for (let i = n - 1; i > 0; i--) {
      if (days[i].rest_hours < days[i - 1].rest_hours) dec++;
      else break;
    }
    if (dec >= 3) patterns.push("DECLINING_REST");
  }

  if (n >= 5) {
    const last5 = days.slice(-5).map(dailyWorkloadIndex);
    if (linearRegressionSlope(last5) > 2) patterns.push("RISING_WORKLOAD");
  }

  if (n >= 7) {
    const last7 = days.slice(-7);
    const allWorkout = last7.every((d) => d.workout_minutes > 0);
    const anyRest8 = last7.some((d) => d.rest_hours >= 8);
    if (allWorkout && !anyRest8) patterns.push("NO_RECOVERY_DAY");
  }

  if (n >= 2) {
    for (let i = 1; i < n; i++) {
      const a = focusScores[i - 1] ?? 0;
      const b = focusScores[i] ?? 0;
      if (Math.abs(b - a) > 30) {
        patterns.push("BOOM_BUST");
        break;
      }
    }
  }

  return patterns;
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

export function applyEscalationRule(
  previousLevel: RiskLevel | null,
  computedLevel: RiskLevel,
  deescalateEligible: boolean
): RiskLevel {
  const pIdx =
    previousLevel === null ? 0 : LEVEL_ORDER.indexOf(previousLevel);
  const cIdx = LEVEL_ORDER.indexOf(computedLevel);
  const safeP = pIdx < 0 ? 0 : pIdx;

  if (cIdx > safeP) {
    const next = Math.min(cIdx, safeP + 1);
    return LEVEL_ORDER[next] ?? "LOW";
  }
  if (cIdx < safeP) {
    if (!deescalateEligible) return LEVEL_ORDER[safeP] ?? "LOW";
    const next = Math.max(cIdx, safeP - 1);
    return LEVEL_ORDER[next] ?? "LOW";
  }
  return LEVEL_ORDER[safeP] ?? "LOW";
}

export function generateRiskExplanation(params: {
  riskScore: number;
  workloadScore: number;
  recoveryScore: number;
  consistencyScore: number;
  patterns: string[];
  days: DailyInput[];
  focusScores: number[];
}): string {
  const {
    riskScore,
    workloadScore,
    recoveryScore,
    consistencyScore,
    patterns,
    days,
    focusScores,
  } = params;
  const parts: string[] = [];

  if (patterns.includes("CONSECUTIVE_HIGH_FOCUS")) {
    let run = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const fs = focusScores[i] ?? 0;
      if (fs > 75) run++;
      else break;
    }
    if (run < 3) run = 3;
    parts.push(
      `${run} consecutive high-focus days with insufficient rest increased burnout risk to ${Math.round(riskScore)}%.`
    );
  }

  if (patterns.includes("DECLINING_REST") && days.length >= 4) {
    let dec = 0;
    for (let i = days.length - 1; i > 0; i--) {
      if (days[i].rest_hours < days[i - 1].rest_hours) dec++;
      else break;
    }
    const end = days[days.length - 1]?.rest_hours ?? 0;
    const start = days[Math.max(0, days.length - 1 - dec)]?.rest_hours ?? end;
    const delta = Math.max(0, start - end);
    parts.push(
      `Recovery trend declining (-${delta.toFixed(1)}h avg sleep over ${dec} days).`
    );
  }

  parts.push(
    `Workload consistency score: ${Math.round(consistencyScore)}/100. Recovery pressure: ${Math.round(recoveryScore)}/100. Load pressure: ${Math.round(workloadScore)}/100.`
  );

  if (parts.length === 0) {
    return `Current burnout risk is ${Math.round(riskScore)}%. Workload ${Math.round(workloadScore)}/100, recovery ${Math.round(recoveryScore)}/100, consistency ${Math.round(consistencyScore)}/100.`;
  }

  return parts.join(" ");
}

export function generateSuggestions(params: {
  riskLevel: RiskLevel;
  patterns: string[];
  days: DailyInput[];
}): string[] {
  const { riskLevel, patterns, days } = params;
  const out: string[] = [];
  const slice = days.slice(-7);

  const lowRest2 = slice.filter((d) => d.rest_hours < 6).length >= 2;
  if (lowRest2) {
    out.push(
      "Prioritise 7–9h of sleep tonight. Consider ending work by 10 PM."
    );
  }

  let highLoadStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const idx = dailyWorkloadIndex(days[i]);
    if (idx > 80) highLoadStreak++;
    else break;
  }
  if (highLoadStreak >= 3) {
    out.push(
      "Schedule a reduced-focus day — aim for ≤60min deep work tomorrow."
    );
  }

  let noWorkout = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].workout_minutes <= 0) noWorkout++;
    else break;
  }
  if (noWorkout >= 4) {
    out.push(
      "Light movement (20min walk) can improve cognitive recovery."
    );
  }

  if (patterns.includes("BOOM_BUST")) {
    out.push(
      "Your focus is inconsistent. Try capping sessions at 50min with mandatory breaks."
    );
  }

  if (riskLevel === "CRITICAL") {
    out.push(
      "Immediate rest recommended. Take a full recovery day — no tracked sessions."
    );
  }

  return Array.from(new Set(out)).slice(0, 3);
}

function deescalationEligible(
  days: DailyInput[],
  previousScore: number | null,
  currentScore: number
): boolean {
  if (days.length >= 2) {
    const a = days[days.length - 1]?.rest_hours ?? 0;
    const b = days[days.length - 2]?.rest_hours ?? 0;
    if (a >= 8 && b >= 8) return true;
  }
  if (previousScore !== null && previousScore - currentScore >= 15) return true;
  return false;
}

export function computeBurnoutRisk(
  days: DailyInput[],
  perfScores: number[],
  focusScores: number[],
  previousLevel: RiskLevel | null,
  previousRiskScore: number | null
): BurnoutRiskResult {
  const workloadScore = computeWorkloadScore(days);
  const recoveryScore = computeRecoveryScore(days);
  const consistencyScore = computeConsistencyScore(perfScores);

  let base =
    workloadScore * WORKLOAD_WEIGHT +
    recoveryScore * RECOVERY_WEIGHT +
    consistencyScore * CONSISTENCY_WEIGHT;

  const detectedPatterns = detectAdvancedPatterns(days, focusScores);
  for (const p of detectedPatterns) {
    base += PATTERN_RISK[p] ?? 0;
  }

  const riskScore = clamp(base, 0, 100);
  const computedLevel = scoreToRiskLevel(riskScore);
  const eligible = deescalationEligible(days, previousRiskScore, riskScore);
  const riskLevel = applyEscalationRule(
    previousLevel,
    computedLevel,
    eligible
  );

  const explanation = generateRiskExplanation({
    riskScore,
    workloadScore,
    recoveryScore,
    consistencyScore,
    patterns: detectedPatterns,
    days,
    focusScores,
  });

  const suggestions = generateSuggestions({
    riskLevel,
    patterns: detectedPatterns,
    days,
  });

  const xpPenaltyMult = XP_PENALTY[riskLevel];

  return {
    riskScore,
    workloadScore,
    recoveryScore,
    consistencyScore,
    riskLevel,
    detectedPatterns,
    explanation,
    suggestions,
    xpPenaltyMult,
  };
}
