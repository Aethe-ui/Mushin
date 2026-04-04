export type BurnoutState = "NORMAL" | "STRAIN" | "BURNOUT";

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
