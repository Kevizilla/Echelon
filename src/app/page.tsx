'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Clock,
  Award,
  Zap,
  Play,
  Plus,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Edit2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { formatXP, formatDurationHuman } from '@/lib/xp';
import { WorkSession, Task } from '@/types';
import Header from '@/components/Header';
import ManualLogModal from '@/components/ManualLogModal';
import EditSessionModal from '@/components/EditSessionModal';

export default function DashboardPage() {
  const {
    sessions,
    tasks,
    activeTimer,
    startTimer,
    loading,
  } = useApp();

  const [showManualLog, setShowManualLog] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [selectedQuickTask, setSelectedQuickTask] = useState<string>('');

  const activeTasks = useMemo(() => tasks.filter((t) => !t.is_archived), [tasks]);

  // Set default quick task if not set
  React.useEffect(() => {
    if (activeTasks.length > 0 && !selectedQuickTask) {
      setSelectedQuickTask(activeTasks[0].id);
    }
  }, [activeTasks, selectedQuickTask]);

  // Calculations for Today, This Week, and Lifetime
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Start of current week (Monday)
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - distanceToMonday
    ).getTime();

    let xpToday = 0;
    let xpThisWeek = 0;
    let xpLifetime = 0;
    let secondsToday = 0;

    sessions.forEach((s) => {
      const sessionTime = new Date(s.ended_at).getTime();
      const earned = s.xp_earned || 0;
      xpLifetime += earned;

      if (sessionTime >= startOfWeek) {
        xpThisWeek += earned;
      }
      if (sessionTime >= startOfToday) {
        xpToday += earned;
        secondsToday += s.duration_seconds || 0;
      }
    });

    return {
      xpToday,
      xpThisWeek,
      xpLifetime,
      secondsToday,
    };
  }, [sessions]);

  // 7-day XP chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const days: { dateStr: string; label: string; xp: number; timeSec: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      days.push({ dateStr, label, xp: 0, timeSec: 0 });
    }

    sessions.forEach((s) => {
      const sDateStr = new Date(s.ended_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
      const match = days.find((d) => d.dateStr === sDateStr);
      if (match) {
        match.xp += s.xp_earned || 0;
        match.timeSec += s.duration_seconds || 0;
      }
    });

    return days.map((d) => ({
      ...d,
      xp: Math.round(d.xp * 100) / 100,
    }));
  }, [sessions]);

  const recentSessions = useMemo(() => {
    return sessions.slice(0, 6);
  }, [sessions]);

  const handleQuickStart = () => {
    const task = activeTasks.find((t) => t.id === selectedQuickTask);
    if (task) {
      startTimer(task);
    }
  };

  return (
    <div className="pb-12">
      <Header
        onToggleMobileMenu={() => {}}
        onOpenManualLog={() => setShowManualLog(true)}
        title="Dashboard"
        subtitle="Track personal productivity, earned XP, and activity momentum"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">XP Today</span>
              <Zap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                {formatXP(stats.xpToday)}
              </span>
              <span className="text-xs text-muted-foreground">XP</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {stats.xpToday > 0 ? 'Consistent progress logged' : 'No XP logged yet today'}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">XP This Week</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                {formatXP(stats.xpThisWeek)}
              </span>
              <span className="text-xs text-muted-foreground">XP</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Mon – Sun current cycle</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Time Today</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                {formatDurationHuman(stats.secondsToday)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Focused productive time</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Lifetime XP</span>
              <Award className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                {formatXP(stats.xpLifetime)}
              </span>
              <span className="text-xs text-muted-foreground">XP</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Total verified effort</p>
          </div>
        </div>

        {/* Action Bar / Quick Start Timer */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Quick Start Timer</h2>
              <p className="text-xs text-muted-foreground">
                Begin a work session immediately without leaving the dashboard
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {activeTasks.length > 0 ? (
              <>
                <select
                  value={selectedQuickTask}
                  onChange={(e) => setSelectedQuickTask(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-foreground focus:outline-none min-w-[220px]"
                >
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (
                      {t.scoring_method === 'time'
                        ? `${t.xp_rate} XP/${t.time_unit || 'hr'}`
                        : `${t.xp_rate} XP/unit`}
                      )
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleQuickStart}
                  disabled={!!activeTimer}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{activeTimer ? 'Timer Already Running' : 'Start Timer'}</span>
                </button>
              </>
            ) : (
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Your First Activity</span>
              </Link>
            )}

            <button
              onClick={() => setShowManualLog(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Completed Work</span>
            </button>
          </div>
        </div>

        {/* 7-Day Chart & Activity Highlights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-day Bar Chart */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Daily XP (Last 7 Days)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Proportionally calculated experience points
                </p>
              </div>
              <Link
                href="/analytics"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
              >
                <span>Full Analytics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs">
                            <p className="font-semibold text-foreground">{data.label}</p>
                            <p className="text-emerald-500 font-mono mt-1">
                              {data.xp} XP Earned
                            </p>
                            {data.timeSec > 0 && (
                              <p className="text-muted-foreground mt-0.5">
                                {formatDurationHuman(data.timeSec)} focused
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="xp"
                    fill="var(--foreground)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Shortcuts & Momentum */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Active Workflows</h3>
                <Link
                  href="/tasks"
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  Manage ({tasks.length})
                </Link>
              </div>

              <div className="mt-3 space-y-2">
                {activeTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 p-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-foreground truncate">{task.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: task.category?.color || '#6366f1' }}
                        />
                        <span>{task.category?.name || 'General'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-medium text-foreground">
                        {task.scoring_method === 'time'
                          ? `${task.xp_rate} XP/${task.time_unit || 'hr'}`
                          : `${task.xp_rate} XP/ea`}
                      </span>
                    </div>
                  </div>
                ))}

                {activeTasks.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No active tasks yet. Create one to begin tracking!
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <Link
                href="/calendar"
                className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Monthly Productivity Heatmap</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Work Sessions */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Work Sessions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved duration, completed quantities, and earned XP
              </p>
            </div>
            <Link
              href="/sessions"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
            >
              <span>View All Sessions</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">No work sessions recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a timer or log completed work to build your productivity history.
              </p>
              <button
                onClick={() => setShowManualLog(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log First Session</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="pb-2.5 font-medium">Date & Time</th>
                    <th className="pb-2.5 font-medium">Activity</th>
                    <th className="pb-2.5 font-medium">Category</th>
                    <th className="pb-2.5 font-medium">Recorded Work</th>
                    <th className="pb-2.5 font-medium">Rate Applied</th>
                    <th className="pb-2.5 font-medium text-right">XP Earned</th>
                    <th className="pb-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentSessions.map((s) => {
                    const sessionDate = new Date(s.ended_at);
                    return (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 text-muted-foreground font-mono">
                          {sessionDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-[11px] opacity-75">
                            {sessionDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-foreground">
                          {s.task_name}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 px-2 py-0.5 text-[11px] font-medium text-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: s.category_color || '#6366f1' }}
                            />
                            {s.category_name}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-foreground">
                          {s.scoring_method === 'time'
                            ? formatDurationHuman(s.duration_seconds)
                            : `${s.quantity} units`}
                        </td>
                        <td className="py-3 text-muted-foreground font-mono text-[11px]">
                          {s.scoring_method === 'time'
                            ? `${s.xp_rate} XP/${s.time_unit || 'hr'}`
                            : `${s.xp_rate} XP/ea`}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-emerald-500">
                          +{formatXP(s.xp_earned)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setEditingSession(s)}
                            title="Edit Session"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ManualLogModal
        isOpen={showManualLog}
        onClose={() => setShowManualLog(false)}
      />

      <EditSessionModal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
      />
    </div>
  );
}
