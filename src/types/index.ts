export type ScoringMethod = 'time' | 'quantity';
export type TimeUnit = 'hour' | 'minute';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  description: string;
  scoring_method: ScoringMethod;
  time_unit: TimeUnit;
  xp_rate: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined relation for convenience
  category?: Category | null;
}

export interface WorkSession {
  id: string;
  user_id: string;
  task_id: string | null;
  category_id: string | null;
  task_name: string;
  category_name: string;
  category_color: string;
  scoring_method: ScoringMethod;
  time_unit: TimeUnit;
  xp_rate: number;
  duration_seconds: number;
  quantity: number | null;
  xp_earned: number;
  started_at: string;
  ended_at: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: string;
  user_id: string;
  task_id: string;
  accumulated_seconds: number;
  is_running: boolean;
  last_started_at: string | null;
  session_start_time: string;
  created_at: string;
  updated_at: string;
  // Joined task
  task?: Task | null;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}
