import { Category, Task, WorkSession, ActiveTimer, UserProfile } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_USER, INITIAL_CATEGORIES, INITIAL_TASKS, generateInitialSessions } from './mockData';
import { calculateXP } from '@/lib/xp';

const STORAGE_KEYS = {
  USER: 'echelon_user',
  CATEGORIES: 'echelon_categories',
  TASKS: 'echelon_tasks',
  SESSIONS: 'echelon_sessions',
  ACTIVE_TIMER: 'echelon_active_timer',
};

// Helper for localStorage with SSR safety
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export class Repository {
  private static get isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  // AUTHENTICATION
  static async getCurrentUser(): Promise<UserProfile | null> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return null;
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Fetch profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Gracefully prioritize profiles.display_name, then user authentication metadata
      const displayName =
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        '';

      return {
        id: user.id,
        email: user.email || '',
        display_name: displayName,
        created_at: profile?.created_at || user.created_at || new Date().toISOString(),
        updated_at: profile?.updated_at || user.updated_at || new Date().toISOString(),
      };
    } else {
      // Local storage profile if authenticated locally
      return getStored<UserProfile | null>(STORAGE_KEYS.USER, null);
    }
  }

  static async signUp(email: string, password: string, displayName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return { user: null, error: 'Database not configured' };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) return { user: null, error: error.message };
      if (!data.user) return { user: null, error: 'Failed to create user' };

      return {
        user: {
          id: data.user.id,
          email: data.user.email || email,
          display_name: displayName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    } else {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email,
        display_name: displayName || email.split('@')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStored(STORAGE_KEYS.USER, newUser);
      return { user: newUser, error: null };
    }
  }

  static async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return { user: null, error: 'Database not configured' };
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { user: null, error: error.message };
      if (!data.user) return { user: null, error: 'Failed to sign in' };

      return {
        user: {
          id: data.user.id,
          email: data.user.email || email,
          display_name: data.user.user_metadata?.display_name || email.split('@')[0],
          created_at: data.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    } else {
      const current = getStored<UserProfile>(STORAGE_KEYS.USER, DEMO_USER);
      return { user: current, error: null };
    }
  }

  static async signOut(): Promise<void> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
  }

  static async updateProfile(displayName: string): Promise<UserProfile | null> {
    const cleanName = displayName.trim();

    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Database not configured');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated with Supabase');

      const now = new Date().toISOString();

      // Upsert into profiles table to gracefully handle both existing and missing profile rows
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            display_name: cleanName,
            updated_at: now,
          },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle();

      if (profileError) {
        console.error('Error updating profiles table:', profileError);
      }

      // Always update Supabase auth user_metadata so metadata stays in sync
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { display_name: cleanName },
      });

      if (authUpdateError && profileError) {
        throw authUpdateError || profileError;
      }

      return {
        id: user.id,
        email: user.email || '',
        display_name: profile?.display_name ?? cleanName,
        created_at: profile?.created_at || user.created_at || now,
        updated_at: profile?.updated_at || now,
      };
    } else {
      const user = await this.getCurrentUser();
      if (!user) return null;
      const updated: UserProfile = {
        ...user,
        display_name: cleanName,
        updated_at: new Date().toISOString(),
      };
      setStored(STORAGE_KEYS.USER, updated);
      return updated;
    }
  }

  // CATEGORIES
  static async getCategories(): Promise<Category[]> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
      return data || [];
    } else {
      return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
  }

  static async createCategory(name: string, color: string): Promise<Category> {
    const user = await this.getCurrentUser();
    const userId = user?.id || DEMO_USER.id;

    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name, color })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const cats = await this.getCategories();
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        user_id: userId,
        name,
        color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStored(STORAGE_KEYS.CATEGORIES, [...cats, newCat]);
      return newCat;
    }
  }

  static async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const cats = await this.getCategories();
      const index = cats.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Category not found');
      const updated = { ...cats[index], ...updates, updated_at: new Date().toISOString() };
      cats[index] = updated;
      setStored(STORAGE_KEYS.CATEGORIES, cats);
      return updated;
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } else {
      const cats = await this.getCategories();
      setStored(
        STORAGE_KEYS.CATEGORIES,
        cats.filter((c) => c.id !== id)
      );
    }
  }

  // TASKS
  static async getTasks(includeArchived = false): Promise<Task[]> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return [];
      let query = supabase.from('tasks').select('*, category:categories(*)');
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
      return data || [];
    } else {
      const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const categories = await this.getCategories();
      const enriched = tasks.map((t) => ({
        ...t,
        category: categories.find((c) => c.id === t.category_id) || null,
      }));
      return includeArchived ? enriched : enriched.filter((t) => !t.is_archived);
    }
  }

  static async createTask(task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const user = await this.getCurrentUser();
    const userId = user?.id || DEMO_USER.id;

    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          category_id: task.category_id,
          name: task.name,
          description: task.description || '',
          scoring_method: task.scoring_method,
          time_unit: task.time_unit,
          xp_rate: task.xp_rate,
          is_archived: false,
        })
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data;
    } else {
      const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const categories = await this.getCategories();
      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}`,
        user_id: userId,
        description: task.description || '',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: categories.find((c) => c.id === task.category_id) || null,
      };
      setStored(STORAGE_KEYS.TASKS, [newTask, ...tasks]);
      return newTask;
    }
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data;
    } else {
      const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const categories = await this.getCategories();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Task not found');
      const updated: Task = {
        ...tasks[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      updated.category = categories.find((c) => c.id === updated.category_id) || null;
      tasks[index] = updated;
      setStored(STORAGE_KEYS.TASKS, tasks);
      return updated;
    }
  }

  static async archiveTask(id: string, isArchived: boolean): Promise<Task> {
    return this.updateTask(id, { is_archived: isArchived });
  }

  static async deleteTask(id: string): Promise<void> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } else {
      const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      setStored(
        STORAGE_KEYS.TASKS,
        tasks.filter((t) => t.id !== id)
      );
    }
  }

  // WORK SESSIONS
  static async getSessions(): Promise<WorkSession[]> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .order('ended_at', { ascending: false });
      if (error) {
        console.error('Error fetching work sessions:', error);
        return [];
      }
      return data || [];
    } else {
      let sessions = getStored<WorkSession[] | null>(STORAGE_KEYS.SESSIONS, null);
      if (!sessions) {
        sessions = generateInitialSessions();
        setStored(STORAGE_KEYS.SESSIONS, sessions);
      }
      return [...sessions].sort(
        (a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime()
      );
    }
  }

  static async createSession(
    sessionData: Omit<WorkSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<WorkSession> {
    const user = await this.getCurrentUser();
    const userId = user?.id || DEMO_USER.id;

    // Recalculate XP to guarantee historical calculation accuracy
    const calculatedXP = calculateXP({
      scoringMethod: sessionData.scoring_method,
      xpRate: sessionData.xp_rate,
      durationSeconds: sessionData.duration_seconds,
      timeUnit: sessionData.time_unit,
      quantity: sessionData.quantity,
    });

    const newRecord = {
      ...sessionData,
      xp_earned: calculatedXP,
      user_id: userId,
    };

    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('work_sessions')
        .insert(newRecord)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const sessions = await this.getSessions();
      const sessionWithId: WorkSession = {
        ...newRecord,
        id: `session-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStored(STORAGE_KEYS.SESSIONS, [sessionWithId, ...sessions]);
      return sessionWithId;
    }
  }

  static async updateSession(
    id: string,
    updates: Partial<WorkSession>
  ): Promise<WorkSession> {
    const sessions = await this.getSessions();
    const existing = sessions.find((s) => s.id === id);
    if (!existing) throw new Error('Session not found');

    const merged = { ...existing, ...updates };

    // Recalculate XP based on updated values and the historical/updated rate
    const calculatedXP = calculateXP({
      scoringMethod: merged.scoring_method,
      xpRate: merged.xp_rate,
      durationSeconds: merged.duration_seconds,
      timeUnit: merged.time_unit,
      quantity: merged.quantity,
    });
    merged.xp_earned = calculatedXP;
    merged.updated_at = new Date().toISOString();

    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('work_sessions')
        .update(merged)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const index = sessions.findIndex((s) => s.id === id);
      sessions[index] = merged;
      setStored(STORAGE_KEYS.SESSIONS, sessions);
      return merged;
    }
  }

  static async deleteSession(id: string): Promise<void> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('work_sessions').delete().eq('id', id);
      if (error) throw error;
    } else {
      const sessions = await this.getSessions();
      setStored(
        STORAGE_KEYS.SESSIONS,
        sessions.filter((s) => s.id !== id)
      );
    }
  }

  // ACTIVE TIMER (Persisted across refreshes, single active timer rule)
  static async getActiveTimer(): Promise<ActiveTimer | null> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('active_timers')
        .select('*, task:tasks(*, category:categories(*))')
        .maybeSingle();
      if (error) {
        console.error('Error fetching active timer:', error);
        return null;
      }
      return data;
    } else {
      const timer = getStored<ActiveTimer | null>(STORAGE_KEYS.ACTIVE_TIMER, null);
      if (!timer) return null;
      const tasks = await this.getTasks(true);
      return {
        ...timer,
        task: tasks.find((t) => t.id === timer.task_id) || null,
      };
    }
  }

  static async saveActiveTimer(
    timerData: Omit<ActiveTimer, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<ActiveTimer> {
    const user = await this.getCurrentUser();
    const userId = user?.id || DEMO_USER.id;

    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase not configured');

      // Upsert by user_id
      const { data, error } = await supabase
        .from('active_timers')
        .upsert(
          {
            user_id: userId,
            task_id: timerData.task_id,
            accumulated_seconds: timerData.accumulated_seconds,
            is_running: timerData.is_running,
            last_started_at: timerData.last_started_at,
            session_start_time: timerData.session_start_time,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select('*, task:tasks(*, category:categories(*))')
        .single();

      if (error) throw error;
      return data;
    } else {
      const tasks = await this.getTasks(true);
      const timer: ActiveTimer = {
        ...timerData,
        id: `timer-${Date.now()}`,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task: tasks.find((t) => t.id === timerData.task_id) || null,
      };
      setStored(STORAGE_KEYS.ACTIVE_TIMER, timer);
      return timer;
    }
  }

  static async clearActiveTimer(): Promise<void> {
    if (this.isConfigured) {
      const supabase = createClient();
      if (!supabase) return;
      const user = await this.getCurrentUser();
      if (user) {
        await supabase.from('active_timers').delete().eq('user_id', user.id);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
      }
    }
  }
}
