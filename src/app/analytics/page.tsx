'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Clock,
  Calendar,
  Filter,
  PieChart as PieIcon,
  CheckCircle2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatXP, formatDurationHuman } from '@/lib/xp';
import { WorkSession } from '@/types';
import Header from '@/components/Header';
import EditSessionModal from '@/components/EditSessionModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Repository } from '@/lib/repository';

export default function AnalyticsPage() {
  const { sessions, tasks, categories, refreshData, showToast } = useApp();

  const [dateRangeFilter, setDateRangeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<WorkSession | null>(null);

  // Filter sessions by date range, category, task
  const filteredSessions = useMemo(() => {
    const now = new Date();
    let minTime = 0;

    if (dateRangeFilter === '7d') {
      minTime = now.getTime() - 7 * 86400000;
    } else if (dateRangeFilter === '30d') {
      minTime = now.getTime() - 30 * 86400000;
    } else if (dateRangeFilter === '90d') {
      minTime = now.getTime() - 90 * 86400000;
    }

    return sessions.filter((s) => {
      const sTime = new Date(s.ended_at).getTime();
      if (sTime < minTime) return false;
      if (categoryFilter !== 'all' && s.category_id !== categoryFilter) return false;
      if (taskFilter !== 'all' && s.task_id !== taskFilter) return false;
      return true;
    });
  }, [sessions, dateRangeFilter, categoryFilter, taskFilter]);

  // Daily, Weekly, Monthly Totals & Insights
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Monday start of current week
    const dayOfWeek = now.getDay();
    const dist = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dist).getTime();

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalDailyXP = 0;
    let totalWeeklyXP = 0;
    let totalMonthlyXP = 0;
    let totalPeriodXP = 0;
    let totalPeriodTime = 0;

    const dailyMap = new Map<string, number>();

    sessions.forEach((s) => {
      const sTime = new Date(s.ended_at).getTime();
      const earned = s.xp_earned || 0;
      const dateKey = new Date(s.ended_at).toLocaleDateString('en-CA');

      if (sTime >= startOfToday) totalDailyXP += earned;
      if (sTime >= startOfWeek) totalWeeklyXP += earned;
      if (sTime >= startOfMonth) totalMonthlyXP += earned;

      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + earned);
    });

    filteredSessions.forEach((s) => {
      totalPeriodXP += s.xp_earned || 0;
      totalPeriodTime += s.duration_seconds || 0;
    });

    // Find most productive day across period
    let mostProductiveDay = { date: '—', xp: 0 };
    dailyMap.forEach((xp, dateKey) => {
      if (xp > mostProductiveDay.xp) {
        mostProductiveDay = { date: dateKey, xp };
      }
    });

    // Average daily XP in selected range
    const daysCount =
      dateRangeFilter === '7d'
        ? 7
        : dateRangeFilter === '30d'
        ? 30
        : dateRangeFilter === '90d'
        ? 90
        : Math.max(1, dailyMap.size);

    const averageDailyXP = totalPeriodXP / daysCount;

    return {
      dailyXP: totalDailyXP,
      weeklyXP: totalWeeklyXP,
      monthlyXP: totalMonthlyXP,
      totalPeriodXP,
      totalPeriodTime,
      averageDailyXP,
      mostProductiveDay,
    };
  }, [sessions, filteredSessions, dateRangeFilter]);

  // Trend Chart Data (XP over time in range)
  const trendData = useMemo(() => {
    const daysCount = dateRangeFilter === '7d' ? 7 : dateRangeFilter === '30d' ? 30 : 14;
    const now = new Date();
    const map = new Map<string, { label: string; xp: number; timeSec: number }>();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = d.toLocaleDateString('en-CA');
      const label = d.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      });
      map.set(dateKey, { label, xp: 0, timeSec: 0 });
    }

    filteredSessions.forEach((s) => {
      const dateKey = new Date(s.ended_at).toLocaleDateString('en-CA');
      const entry = map.get(dateKey);
      if (entry) {
        entry.xp += s.xp_earned || 0;
        entry.timeSec += s.duration_seconds || 0;
      }
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      xp: Math.round(item.xp * 100) / 100,
      hours: Math.round((item.timeSec / 3600) * 10) / 10,
    }));
  }, [filteredSessions, dateRangeFilter]);

  // Breakdown by Category
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; xp: number }>();

    filteredSessions.forEach((s) => {
      const catName = s.category_name || 'Uncategorized';
      const existing = map.get(catName);
      if (existing) {
        existing.xp += s.xp_earned || 0;
      } else {
        map.set(catName, {
          name: catName,
          color: s.category_color || '#6366f1',
          xp: s.xp_earned || 0,
        });
      }
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        xp: Math.round(c.xp * 100) / 100,
      }))
      .filter((c) => c.xp > 0)
      .sort((a, b) => b.xp - a.xp);
  }, [filteredSessions]);

  // Breakdown by Task
  const taskData = useMemo(() => {
    const map = new Map<string, { name: string; xp: number; count: number }>();

    filteredSessions.forEach((s) => {
      const name = s.task_name;
      const existing = map.get(name);
      if (existing) {
        existing.xp += s.xp_earned || 0;
        existing.count += 1;
      } else {
        map.set(name, {
          name,
          xp: s.xp_earned || 0,
          count: 1,
        });
      }
    });

    return Array.from(map.values())
      .map((t) => ({
        ...t,
        xp: Math.round(t.xp * 100) / 100,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 6);
  }, [filteredSessions]);

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await Repository.deleteSession(sessionToDelete.id);
      await refreshData();
      showToast('Session deleted', 'info');
      setSessionToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete session', 'error');
    }
  };

  return (
    <div className="pb-12">
      <Header
        onToggleMobileMenu={() => {}}
        title="Analytics & Insights"
        subtitle="Performance breakdown, category allocations, and historical trends"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Period:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
              <button
                onClick={() => setDateRangeFilter('7d')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  dateRangeFilter === '7d'
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDateRangeFilter('30d')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  dateRangeFilter === '30d'
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRangeFilter('90d')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  dateRangeFilter === '90d'
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                90 Days
              </button>
              <button
                onClick={() => setDateRangeFilter('all')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  dateRangeFilter === 'all'
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Time
              </button>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
            >
              <option value="all">All Activities</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aggregate Metric Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Selected Period XP
            </span>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {formatXP(stats.totalPeriodXP)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Across {filteredSessions.length} recorded sessions
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Avg Daily XP
            </span>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {formatXP(stats.averageDailyXP)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Expected daily velocity</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Productive Time
            </span>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {formatDurationHuman(stats.totalPeriodTime)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Recorded duration</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Peak Session Day
            </span>
            <div className="mt-2 font-mono text-xl font-bold text-emerald-500 truncate">
              {stats.mostProductiveDay.date !== '—'
                ? `${formatXP(stats.mostProductiveDay.xp)} XP`
                : '—'}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              {stats.mostProductiveDay.date !== '—'
                ? new Date(stats.mostProductiveDay.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'No peak yet'}
            </p>
          </div>
        </div>

        {/* Trend & Category Breakdown Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Line/Bar Chart */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">XP & Time Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chronological distribution of earned XP across the selected period
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
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
                            {data.hours > 0 && (
                              <p className="text-muted-foreground mt-0.5">
                                {data.hours} hours logged
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
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown (Pie/List) */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">XP by Category</h3>
                <PieIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              {categoryData.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No data for this filter selection.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="h-40 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="xp"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={3}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-md border border-border bg-card px-2.5 py-1.5 shadow-md text-xs">
                                  <span className="font-medium text-foreground">{data.name}: </span>
                                  <span className="font-mono font-semibold text-emerald-500">
                                    {data.xp} XP
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {categoryData.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate text-foreground font-medium">{cat.name}</span>
                        </div>
                        <span className="font-mono font-semibold text-foreground shrink-0">
                          {cat.xp} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Activities Breakdown Table */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Productive Activities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {taskData.map((t, idx) => (
              <div
                key={t.name}
                className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 p-3 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium text-foreground truncate">{t.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {t.count} session{t.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="font-mono font-bold text-foreground shrink-0">
                  {t.xp} XP
                </div>
              </div>
            ))}

            {taskData.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                No activity statistics found for the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Filtered Session History */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Filtered Session History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredSessions.length} sessions matching current criteria
              </p>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No sessions found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="pb-2.5 font-medium">Date & Time</th>
                    <th className="pb-2.5 font-medium">Activity</th>
                    <th className="pb-2.5 font-medium">Category</th>
                    <th className="pb-2.5 font-medium">Work Done</th>
                    <th className="pb-2.5 font-medium text-right">XP Earned</th>
                    <th className="pb-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSessions.map((s) => {
                    const sessionDate = new Date(s.ended_at);
                    return (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                          {sessionDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 font-medium text-foreground whitespace-nowrap">
                          {s.task_name}
                        </td>
                        <td className="py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: s.category_color || '#6366f1' }}
                            />
                            {s.category_name}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-foreground whitespace-nowrap">
                          {s.scoring_method === 'time'
                            ? formatDurationHuman(s.duration_seconds)
                            : `${s.quantity} units`}
                        </td>
                        <td className="py-2.5 font-mono font-bold text-emerald-500 text-right whitespace-nowrap">
                          +{formatXP(s.xp_earned)}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingSession(s)}
                              title="Edit"
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setSessionToDelete(s)}
                              title="Delete"
                              className="p-1 text-muted-foreground hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      <EditSessionModal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
      />

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Session?"
        message={`Delete session for "${sessionToDelete?.task_name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}
