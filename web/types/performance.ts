export type BurnoutState = "NORMAL" | "STRAIN" | "BURNOUT";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface BurnoutRiskScore {
  id: string;
  user_id: string;
  score_date: string;
  risk_score: number;
  workload_score: number;
  recovery_score: number;
  consistency_score: number;
  risk_level: RiskLevel;
  explanation: string | null;
  suggestions: string[];
  xp_penalty_mult: number;
  created_at: string;
  updated_at: string;
}

export interface BurnoutRiskEvent {
  id: string;
  user_id: string;
  event_date: string;
  from_level: RiskLevel;
  to_level: RiskLevel;
  trigger_facts: string[];
  created_at: string;
}

export interface BurnoutHistoryResponse {
  scores: BurnoutRiskScore[];
  events: BurnoutRiskEvent[];
  currentLevel: RiskLevel;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
}

export interface BurnoutComputeResponse {
  riskScore: BurnoutRiskScore;
  escalationEvent?: BurnoutRiskEvent;
  todayXPMultiplier: number;
}

export type WorkoutIntensity = "low" | "medium" | "high" | "none";

export interface WorkoutLog {
  id: string;
  user_id: string;
  logged_date: string;
  duration_min: number;
  intensity: "low" | "medium" | "high";
  created_at: string;
}

export interface RestLog {
  id: string;
  user_id: string;
  logged_date: string;
  hours: number;
  created_at: string;
}

export interface PerformanceSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  focus_score: number;
  fitness_score: number;
  balance_multiplier: number;
  performance_score: number;
  burnout_state: BurnoutState;
  xp_earned: number;
  explanation: string | null;
  created_at: string;
}

export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
  updated_at: string;
}

export interface DailyInput {
  date: string;
  focus_minutes: number;
  focus_sessions: number;
  focus_completion_rate: number;
  workout_minutes: number;
  workout_intensity: WorkoutIntensity;
  rest_hours: number;
}

export interface PerformanceSummary {
  today: PerformanceSnapshot | null;
  last7Days: PerformanceSnapshot[];
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  streakDays: number;
}
