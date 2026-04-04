import type { BurnoutState, DailyInput, WorkoutIntensity } from "@/types/performance";

const FOCUS_TARGET_MIN = 120;
const FITNESS_TARGET_MIN = 45;
const OPTIMAL_REST_LOW = 7;
const OPTIMAL_REST_HIGH = 9;
const CRITICAL_REST_LOW = 5;
const CRITICAL_REST_HIGH = 10;
const XP_PER_POINT = 1;
const STRAIN_XP_MULT = 0.7;
const BURNOUT_XP_MULT = 0.3;
const HIGH_WORKLOAD_THRESHOLD = 70;
const LOW_REST_THRESHOLD = 5;

const INTENSITY_MULT: Record<WorkoutIntensity, number> = {
  none: 0,
  low: 0.6,
  medium: 1.0,
  high: 1.4,
};

export const LEVEL_XP = [
  0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500,
];

export function computeFocusScore(input: DailyInput): number {
  const ratio = Math.min(input.focus_minutes / FOCUS_TARGET_MIN, 1.5);
  const compBonus = input.focus_completion_rate * 20;
  return Math.min(Math.round(ratio * 80 + compBonus), 100);
}

export function computeFitnessScore(input: DailyInput): number {
  if (input.workout_intensity === "none" || input.workout_minutes === 0)
    return 0;
  const effective =
    input.workout_minutes * INTENSITY_MULT[input.workout_intensity];
  return Math.min(Math.round((effective / FITNESS_TARGET_MIN) * 100), 100);
}

export function computeBalanceMultiplier(restHours: number): number {
  const h = restHours;

  if (h >= OPTIMAL_REST_LOW && h <= OPTIMAL_REST_HIGH) return 1.2;

  if (h < CRITICAL_REST_LOW) {
    return Math.max(0.5, 1.0 - (CRITICAL_REST_LOW - h) * 0.15);
  }

  if (h > CRITICAL_REST_HIGH) {
    return Math.max(0.7, 1.0 - (h - CRITICAL_REST_HIGH) * 0.1);
  }

  if (h < OPTIMAL_REST_LOW) {
    const t =
      (h - CRITICAL_REST_LOW) / (OPTIMAL_REST_LOW - CRITICAL_REST_LOW);
    return 0.5 + t * 0.5;
  }

  const t =
    (h - OPTIMAL_REST_HIGH) / (CRITICAL_REST_HIGH - OPTIMAL_REST_HIGH);
  return 1.2 - t * 0.2;
}

export function computePerformanceScore(
  focusScore: number,
  fitnessScore: number,
  balanceMult: number
): number {
  const base = focusScore * 0.6 + fitnessScore * 0.4;
  return Math.round(base * balanceMult);
}

function dailyWorkload(d: DailyInput): number {
  return computeFocusScore(d) * 0.6 + computeFitnessScore(d) * 0.4;
}

export function detectBurnoutState(
  recentDays: DailyInput[],
  todayRestHours: number
): BurnoutState {
  if (recentDays.length < 2) return "NORMAL";

  const last3 = recentDays.slice(-3);
  const last7 = recentDays.slice(-7);

  const avgWorkload3 =
    last3.reduce((s, d) => s + dailyWorkload(d), 0) / last3.length;
  const avgRest3 =
    last3.reduce((s, d) => s + d.rest_hours, 0) / last3.length;
  const avgRest7 =
    last7.reduce((s, d) => s + d.rest_hours, 0) / last7.length;

  const highWorkDays3 = last3.filter(
    (d) => dailyWorkload(d) > HIGH_WORKLOAD_THRESHOLD
  ).length;
  const lowRestDays3 = last3.filter(
    (d) => d.rest_hours < LOW_REST_THRESHOLD
  ).length;
  const lowRestDays7 = last7.filter(
    (d) => d.rest_hours < LOW_REST_THRESHOLD
  ).length;

  if (
    highWorkDays3 >= 2 &&
    lowRestDays3 >= 2 &&
    avgRest3 < LOW_REST_THRESHOLD
  ) {
    return "BURNOUT";
  }

  if (lowRestDays7 >= 4 && avgRest7 < 5.5 && avgWorkload3 > 60) {
    return "BURNOUT";
  }

  if (
    highWorkDays3 >= 1 &&
    (lowRestDays3 >= 1 || avgRest3 < OPTIMAL_REST_LOW) &&
    todayRestHours < OPTIMAL_REST_LOW
  ) {
    return "STRAIN";
  }

  if (avgRest7 < 6 && avgWorkload3 > 50) return "STRAIN";

  return "NORMAL";
}

export function computeXP(
  performanceScore: number,
  burnoutState: BurnoutState
): number {
  const mult =
    burnoutState === "BURNOUT"
      ? BURNOUT_XP_MULT
      : burnoutState === "STRAIN"
        ? STRAIN_XP_MULT
        : 1.0;
  return Math.round(performanceScore * XP_PER_POINT * mult);
}

export function computeLevel(totalXP: number): {
  level: number;
  xpToNext: number;
} {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) {
    if (totalXP >= LEVEL_XP[i]) level = i + 1;
    else return { level, xpToNext: LEVEL_XP[i] - totalXP };
  }
  return { level, xpToNext: 0 };
}

/** Progress within current level: 0–100 for the XP bar. */
export function levelProgressPercent(totalXP: number): number {
  const { level, xpToNext } = computeLevel(totalXP);
  const floor = LEVEL_XP[level - 1] ?? 0;
  const ceiling = LEVEL_XP[level];
  if (ceiling === undefined || xpToNext === 0) return 100;
  const span = ceiling - floor;
  if (span <= 0) return 100;
  const inLevel = totalXP - floor;
  return Math.min(100, Math.round((inLevel / span) * 100));
}

export function generateExplanation(params: {
  input: DailyInput;
  focusScore: number;
  fitnessScore: number;
  balanceMult: number;
  performanceScore: number;
  burnoutState: BurnoutState;
  xpEarned: number;
  recentDays: DailyInput[];
}): string {
  const {
    input,
    focusScore,
    fitnessScore,
    balanceMult,
    performanceScore,
    burnoutState,
    xpEarned,
    recentDays,
  } = params;

  const lines: string[] = [];

  if (input.focus_minutes >= FOCUS_TARGET_MIN) {
    lines.push(
      `Strong focus day: ${input.focus_minutes}min logged (target: ${FOCUS_TARGET_MIN}min), scoring ${focusScore}/100.`
    );
  } else if (input.focus_minutes > 0) {
    const pct = Math.round(
      (input.focus_minutes / FOCUS_TARGET_MIN) * 100
    );
    lines.push(
      `Focus at ${pct}% of target: ${input.focus_minutes}min of ${FOCUS_TARGET_MIN}min goal, scoring ${focusScore}/100.`
    );
  } else {
    lines.push(`No focus sessions logged today (focus score: 0).`);
  }

  if (input.workout_intensity !== "none" && input.workout_minutes > 0) {
    const label =
      input.workout_intensity.charAt(0).toUpperCase() +
      input.workout_intensity.slice(1);
    lines.push(
      `${label}-intensity workout: ${input.workout_minutes}min, fitness score ${fitnessScore}/100.`
    );
  } else {
    lines.push(`No workout logged today (fitness score: 0).`);
  }

  if (
    input.rest_hours >= OPTIMAL_REST_LOW &&
    input.rest_hours <= OPTIMAL_REST_HIGH
  ) {
    lines.push(
      `Optimal rest (${input.rest_hours}h) earned a +20% balance bonus (multiplier: ${balanceMult.toFixed(2)}).`
    );
  } else if (input.rest_hours < CRITICAL_REST_LOW) {
    const penaltyPct = Math.round((1 - balanceMult) * 100);
    lines.push(
      `Critical low rest (${input.rest_hours}h, target: ${OPTIMAL_REST_LOW}–${OPTIMAL_REST_HIGH}h) applied a ${penaltyPct}% penalty (multiplier: ${balanceMult.toFixed(2)}).`
    );
  } else {
    lines.push(
      `Rest logged at ${input.rest_hours}h (balance multiplier: ${balanceMult.toFixed(2)}).`
    );
  }

  if (burnoutState === "BURNOUT") {
    const lowCount = recentDays
      .slice(-3)
      .filter((d) => d.rest_hours < LOW_REST_THRESHOLD).length;
    lines.push(
      `⚠️ BURNOUT DETECTED: ${lowCount} of the last 3 days had critically low rest (<${LOW_REST_THRESHOLD}h) combined with high workload. XP reduced to ${Math.round(BURNOUT_XP_MULT * 100)}% of normal. Prioritise recovery.`
    );
  } else if (burnoutState === "STRAIN") {
    lines.push(
      `⚡ STRAIN detected: Rest has been below ${OPTIMAL_REST_LOW}h for recent days. XP reduced to ${Math.round(STRAIN_XP_MULT * 100)}% of normal. Consider a lighter day.`
    );
  }

  lines.push(
    `Performance score: ${performanceScore} → ${xpEarned} XP earned today.`
  );

  return lines.join(" ");
}
