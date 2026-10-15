'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { UserProfile, Task, Category, WorkSession, ActiveTimer } from '@/types';
import { Repository } from '@/lib/repository';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: UserProfile | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isSupabaseMode: boolean;
  tasks: Task[];
  categories: Category[];
  sessions: WorkSession[];
  activeTimer: ActiveTimer | null;
  timerElapsed: number;
  loading: boolean;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  refreshData: () => Promise<void>;
  startTimer: (task: Task) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  finishTimer: () => Promise<WorkSession | null>;
  discardTimer: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [timerElapsed, setTimerElapsed] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('echelon_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('echelon_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const refreshData = useCallback(async () => {
    try {
      const [currentUser, catList, taskList, sessionList, currentTimer] = await Promise.all([
        Repository.getCurrentUser(),
        Repository.getCategories(),
        Repository.getTasks(true),
        Repository.getSessions(),
        Repository.getActiveTimer(),
      ]);

      setUser(currentUser);
      setCategories(catList);
      setTasks(taskList);
      setSessions(sessionList);
      setActiveTimer(currentTimer);

      if (currentTimer) {
        if (currentTimer.is_running && currentTimer.last_started_at) {
          const delta = Math.max(
            0,
            Math.floor((Date.now() - new Date(currentTimer.last_started_at).getTime()) / 1000)
          );
          setTimerElapsed(currentTimer.accumulated_seconds + delta);
        } else {
          setTimerElapsed(currentTimer.accumulated_seconds);
        }
      } else {
        setTimerElapsed(0);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
          refreshData();
        });
        return () => subscription.unsubscribe();
      }
    }
  }, [refreshData]);

  // Tick interval for active timer
  useEffect(() => {
    if (!activeTimer) {
      setTimerElapsed(0);
      return;
    }

    if (!activeTimer.is_running) {
      setTimerElapsed(activeTimer.accumulated_seconds);
      return;
    }

    const updateTime = () => {
      if (activeTimer.last_started_at) {
        const delta = Math.max(
          0,
          Math.floor((Date.now() - new Date(activeTimer.last_started_at).getTime()) / 1000)
        );
        setTimerElapsed(activeTimer.accumulated_seconds + delta);
      } else {
        setTimerElapsed(activeTimer.accumulated_seconds);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = async (task: Task) => {
    if (activeTimer) {
      showToast('A timer is already active. Please finish or discard it first.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const newTimerData = {
      task_id: task.id,
      accumulated_seconds: 0,
      is_running: true,
      last_started_at: nowIso,
      session_start_time: nowIso,
    };

    try {
      const saved = await Repository.saveActiveTimer(newTimerData);
      setActiveTimer(saved);
      setTimerElapsed(0);
      showToast(`Started timer for "${task.name}"`, 'info');
    } catch (err) {
      console.error('Failed to start timer:', err);
      showToast('Could not start timer', 'error');
    }
  };

  const pauseTimer = async () => {
    if (!activeTimer || !activeTimer.is_running) return;

    let delta = 0;
    if (activeTimer.last_started_at) {
      delta = Math.max(
        0,
        Math.floor((Date.now() - new Date(activeTimer.last_started_at).getTime()) / 1000)
      );
    }

    const newAccumulated = activeTimer.accumulated_seconds + delta;
    const updated = {
      ...activeTimer,
      accumulated_seconds: newAccumulated,
      is_running: false,
      last_started_at: null,
    };

    try {
      const saved = await Repository.saveActiveTimer(updated);
      setActiveTimer(saved);
      setTimerElapsed(newAccumulated);
      showToast('Timer paused', 'info');
    } catch (err) {
      console.error('Failed to pause timer:', err);
      showToast('Could not pause timer', 'error');
    }
  };

  const resumeTimer = async () => {
    if (!activeTimer || activeTimer.is_running) return;

    const nowIso = new Date().toISOString();
    const updated = {
      ...activeTimer,
      is_running: true,
      last_started_at: nowIso,
    };

    try {
      const saved = await Repository.saveActiveTimer(updated);
      setActiveTimer(saved);
      showToast('Timer resumed', 'info');
    } catch (err) {
      console.error('Failed to resume timer:', err);
      showToast('Could not resume timer', 'error');
    }
  };

  const finishTimer = async (): Promise<WorkSession | null> => {
    if (!activeTimer) return null;

    let finalSeconds = activeTimer.accumulated_seconds;
    if (activeTimer.is_running && activeTimer.last_started_at) {
      const delta = Math.max(
        0,
        Math.floor((Date.now() - new Date(activeTimer.last_started_at).getTime()) / 1000)
      );
      finalSeconds += delta;
    }

    if (finalSeconds < 5) {
      showToast('Session was less than 5 seconds. Discarded.', 'info');
      await discardTimer();
      return null;
    }

    const task = tasks.find((t) => t.id === activeTimer.task_id) || activeTimer.task;
    const category = categories.find((c) => c.id === task?.category_id);

    const nowIso = new Date().toISOString();
    const sessionPayload = {
      task_id: task?.id || null,
      category_id: category?.id || null,
      task_name: task?.name || 'Unnamed Task',
      category_name: category?.name || 'General',
      category_color: category?.color || '#6366f1',
      scoring_method: task?.scoring_method || 'time',
      time_unit: task?.time_unit || 'hour',
      xp_rate: task?.xp_rate || 0,
      duration_seconds: finalSeconds,
      quantity: null,
      xp_earned: 0, // Recalculated by repository
      started_at: activeTimer.session_start_time,
      ended_at: nowIso,
    };

    try {
      const created = await Repository.createSession(sessionPayload);
      await Repository.clearActiveTimer();
      setActiveTimer(null);
      setTimerElapsed(0);
      await refreshData();
      showToast(`Session recorded! +${created.xp_earned} XP earned`, 'success');
      return created;
    } catch (err) {
      console.error('Failed to finish timer:', err);
      showToast('Error saving work session', 'error');
      return null;
    }
  };

  const discardTimer = async () => {
    try {
      await Repository.clearActiveTimer();
      setActiveTimer(null);
      setTimerElapsed(0);
      showToast('Timer discarded', 'info');
    } catch (err) {
      console.error('Failed to discard timer:', err);
    }
  };

  const updateProfile = async (displayName: string): Promise<boolean> => {
    try {
      const updated = await Repository.updateProfile(displayName);
      if (updated) {
        setUser(updated);
        showToast('Profile updated successfully', 'success');
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      showToast((err as Error).message || 'Failed to update profile', 'error');
      return false;
    }
  };

  const signOut = async () => {
    try {
      await Repository.signOut();
      setUser(null);
      await refreshData();
      showToast('Signed out successfully', 'info');
    } catch (err) {
      console.error('Error signing out:', err);
      showToast('Error signing out', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        theme,
        toggleTheme,
        isSupabaseMode: isSupabaseConfigured(),
        tasks,
        categories,
        sessions,
        activeTimer,
        timerElapsed,
        loading,
        toast,
        showToast,
        refreshData,
        startTimer,
        pauseTimer,
        resumeTimer,
        finishTimer,
        discardTimer,
        updateProfile,
        signOut,
      }}
    >
      {children}
      {/* Toast Notification element */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              toast.type === 'success'
                ? 'bg-emerald-500'
                : toast.type === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-500'
            }`}
          />
          <span className="text-foreground">{toast.message}</span>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
