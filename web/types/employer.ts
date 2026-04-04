import type { RiskLevel, BurnoutState } from "./performance";

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: "admin" | "manager" | "member";
  display_name: string | null;
  email: string | null;
  joined_at: string;
}

export interface EmployeeSnapshot {
  user_id: string;
  display_name: string | null;
  email: string | null;
  current_state: BurnoutState;
  risk_level: RiskLevel;
  risk_score: number;
  last_activity: string | null;
  workload_score: number;
  recovery_score: number;
  consistency_score: number;
  streak_days: number;
}

export interface EmployeeDetail extends EmployeeSnapshot {
  snapshots_7d: DailyEmployeeLog[];
  burnout_history: BurnoutPoint[];
  state_transitions: StateTransition[];
  accountability: AccountabilityEntry[];
  detected_patterns: string[];
}

export interface DailyEmployeeLog {
  date: string;
  focus_score: number | null;
  fitness_score: number | null;
  performance_score: number | null;
  burnout_state: BurnoutState | null;
  workout_minutes: number;
  rest_hours: number;
}

export interface BurnoutPoint {
  date: string;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface StateTransition {
  date: string;
  from_state: string;
  to_state: string;
}

export interface EmployerAlert {
  id: string;
  user_id: string;
  display_name: string | null;
  alert_type: "WARNING" | "CRITICAL";
  risk_level: RiskLevel;
  message: string;
  status: "active" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

export interface AccountabilityEntry {
  id: string;
  log_date: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  /** Present on org-wide API responses for employer views. */
  employee_display_name?: string | null;
}

export interface TeamSummary {
  total_members: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  avg_risk_score: number;
  active_alerts: number;
}

export type SortKey =
  | "risk_score"
  | "last_activity"
  | "display_name"
  | "current_state";
export type FilterState = BurnoutState | "ALL";
export type FilterRisk = RiskLevel | "ALL";
