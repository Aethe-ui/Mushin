export type SessionStatus = "idle" | "active" | "break" | "complete";

export type DbSessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface WorkspaceRow {
  id: string;
  owner_id: string;
  title: string;
  content: string | null;
  updated_at: string;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: DbSessionStatus;
  goal: string | null;
  planned_duration: number | null;
  created_at: string;
}

export interface CollaboratorUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

export interface PresenceRow {
  id: string;
  workspace_id: string;
  user_id: string;
  last_seen: string;
}
