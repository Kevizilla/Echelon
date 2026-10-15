'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatXP, formatDurationHuman } from '@/lib/xp';
import { WorkSession } from '@/types';
import Header from '@/components/Header';
import EditSessionModal from '@/components/EditSessionModal';
import ManualLogModal from '@/components/ManualLogModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Repository } from '@/lib/repository';

export default function CalendarPage() {
  const { sessions, loading, refreshData, showToast } = useApp();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  });

  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<WorkSession | null>(null);
  const [showManualLog, setShowManualLog] = useState(false);

  // Group sessions by local date (YYYY-MM-DD)
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkSession[]>();
    sessions.forEach((s) => {
      const d = new Date(s.ended_at);
      const dateKey = d.toLocaleDateString('en-CA'); // Local YYYY-MM-DD
      const existing = map.get(dateKey) || [];
      existing.push(s);
      map.set(dateKey, existing);
    });
    return map;
  }, [sessions]);

  // Calendar month matrix
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    // Adjust to Monday start: 0 (Mon) to 6 (Sun)
    const adjustedStart = (startingDayOfWeek + 6) % 7;

    const totalDays = lastDayOfMonth.getDate();
    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      totalXP: number;
      durationSec: number;
      sessionCount: number;
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = adjustedStart - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toLocaleDateString('en-CA');
      const daySessions = sessionsByDate.get(dateStr) || [];
      const totalXP = daySessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
      const durationSec = daySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        totalXP,
        durationSec,
        sessionCount: daySessions.length,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const thisDate = new Date(year, month, i);
      const dateStr = thisDate.toLocaleDateString('en-CA');
      const daySessions = sessionsByDate.get(dateStr) || [];
      const totalXP = daySessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
      const durationSec = daySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        totalXP,
        durationSec,
        sessionCount: daySessions.length,
      });
    }

    // Next month padding to fill out 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toLocaleDateString('en-CA');
      const daySessions = sessionsByDate.get(dateStr) || [];
      const totalXP = daySessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
      const durationSec = daySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        totalXP,
        durationSec,
        sessionCount: daySessions.length,
      });
    }

    return days;
  }, [year, month, sessionsByDate]);

  // Max daily XP in current calendar view for scaling heatmap intensity
  const maxXPInView = useMemo(() => {
    let max = 1;
    calendarDays.forEach((d) => {
      if (d.totalXP > max) max = d.totalXP;
    });
    return max;
  }, [calendarDays]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toLocaleDateString('en-CA'));
  };

  // Selected day sessions
  const selectedDaySessions = useMemo(() => {
    return sessionsByDate.get(selectedDateStr) || [];
  }, [sessionsByDate, selectedDateStr]);

  const selectedDayTotals = useMemo(() => {
    let xp = 0;
    let sec = 0;
    selectedDaySessions.forEach((s) => {
      xp += s.xp_earned || 0;
      sec += s.duration_seconds || 0;
    });
    return { xp, sec };
  }, [selectedDaySessions]);

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

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Intensity color generator
  const getHeatmapColor = (xp: number, isCurrentMonth: boolean) => {
    if (xp <= 0) return 'bg-background hover:bg-muted/40';

    const ratio = xp / maxXPInView;
    if (ratio < 0.25) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium';
    if (ratio < 0.5) return 'bg-emerald-500/35 text-emerald-600 dark:text-emerald-300 font-medium';
    if (ratio < 0.75) return 'bg-emerald-500/55 text-white font-semibold';
    return 'bg-emerald-600 text-white font-bold';
  };

  return (
    <div className="pb-12">
      <Header
        onToggleMobileMenu={() => {}}
        onOpenManualLog={() => setShowManualLog(true)}
        title="Productivity Calendar"
        subtitle="Monthly heatmap intensity indicator and daily session breakdowns"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Month Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleToday}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Heatmap Legend */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground mr-4">
              <span>Less</span>
              <span className="h-3 w-3 rounded-xs bg-background border border-border" />
              <span className="h-3 w-3 rounded-xs bg-emerald-500/20" />
              <span className="h-3 w-3 rounded-xs bg-emerald-500/40" />
              <span className="h-3 w-3 rounded-xs bg-emerald-500/70" />
              <span className="h-3 w-3 rounded-xs bg-emerald-600" />
              <span>More XP</span>
            </div>

            <div className="flex items-center rounded-md border border-border bg-card">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="h-4 w-[1px] bg-border" />
              <button
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Calendar Heatmap Grid */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold text-muted-foreground py-2.5">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {calendarDays.map((day) => {
              const isSelected = day.dateStr === selectedDateStr;
              const isToday = day.dateStr === todayStr;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`min-h-[75px] sm:min-h-[90px] p-2 text-left flex flex-col justify-between transition-all relative ${
                    day.isCurrentMonth ? '' : 'opacity-40 bg-muted/10'
                  } ${isSelected ? 'ring-2 ring-primary ring-inset z-10' : ''} ${getHeatmapColor(
                    day.totalXP,
                    day.isCurrentMonth
                  )}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-medium rounded-full h-6 w-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-foreground text-background font-bold shadow-xs'
                          : ''
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {day.totalXP > 0 && (
                      <span className="text-[10px] font-mono tracking-tight opacity-90 hidden sm:inline">
                        +{formatXP(day.totalXP)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {day.sessionCount > 0 ? (
                      <div className="text-[10px] opacity-80 leading-tight">
                        <span>{day.sessionCount} session{day.sessionCount > 1 ? 's' : ''}</span>
                        {day.durationSec > 0 && (
                          <div className="hidden sm:block text-[9px] opacity-75">
                            {formatDurationHuman(day.durationSec)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/30 font-light">
                        {loading ? '...' : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Drawer / Details Panel */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">
                  {new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed session breakdown and accomplishments for this date
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span>Total XP:</span>
                <span className="font-mono font-bold text-foreground">
                  +{formatXP(selectedDayTotals.xp)} XP
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span>Productive Time:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatDurationHuman(selectedDayTotals.sec)}
                </span>
              </div>

              <button
                onClick={() => setShowManualLog(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log on this Day</span>
              </button>
            </div>
          </div>

          {/* List of sessions for selected day */}
          <div className="mt-4">
            {selectedDaySessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No productive work sessions recorded on this day.
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDaySessions.map((s) => {
                  const sTime = new Date(s.ended_at);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/50 p-3 text-xs hover:border-foreground/20 transition-all"
                    >
                      <div className="min-w-0 pr-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">
                            {s.task_name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: s.category_color || '#6366f1' }}
                            />
                            {s.category_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                          <span>
                            {sTime.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {s.scoring_method === 'time'
                              ? `${formatDurationHuman(s.duration_seconds)} recorded`
                              : `${s.quantity} items completed`}
                          </span>
                          <span>•</span>
                          <span>
                            Rate: {s.xp_rate} XP/{s.scoring_method === 'time' ? s.time_unit || 'hr' : 'ea'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono font-bold text-emerald-500 text-sm">
                          +{formatXP(s.xp_earned)} XP
                        </div>

                        <div className="flex items-center gap-1 border-l border-border pl-3">
                          <button
                            onClick={() => setEditingSession(s)}
                            title="Edit Session"
                            className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setSessionToDelete(s)}
                            title="Delete Session"
                            className="p-1 rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
