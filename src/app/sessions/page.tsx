'use client';

import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Clock,
  Sparkles,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatTimerClock, formatXP, formatDurationHuman, calculateXP } from '@/lib/xp';
import { WorkSession } from '@/types';
import { Repository } from '@/lib/repository';
import Header from '@/components/Header';
import ManualLogModal from '@/components/ManualLogModal';
import EditSessionModal from '@/components/EditSessionModal';
import ConfirmModal from '@/components/ConfirmModal';

export default function SessionsPage() {
  const {
    tasks,
    sessions,
    activeTimer,
    timerElapsed,
    startTimer,
    pauseTimer,
    resumeTimer,
    finishTimer,
    discardTimer,
    refreshData,
    showToast,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showManualLog, setShowManualLog] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<WorkSession | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const activeTasks = useMemo(() => tasks.filter((t) => !t.is_archived), [tasks]);

  // Set default selected task if not selected
  React.useEffect(() => {
    if (activeTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [activeTasks, selectedTaskId]);

  const currentTask = useMemo(() => {
    if (activeTimer) {
      return tasks.find((t) => t.id === activeTimer.task_id) || activeTimer.task;
    }
    return activeTasks.find((t) => t.id === selectedTaskId);
  }, [activeTimer, tasks, activeTasks, selectedTaskId]);

  const liveXP = useMemo(() => {
    if (!currentTask) return 0;
    return calculateXP({
      scoringMethod: currentTask.scoring_method,
      xpRate: currentTask.xp_rate,
      durationSeconds: timerElapsed,
      timeUnit: currentTask.time_unit,
    });
  }, [currentTask, timerElapsed]);

  const handleStart = () => {
    const task = activeTasks.find((t) => t.id === selectedTaskId);
    if (task) {
      startTimer(task);
    }
  };

  const handleFinish = async () => {
    await finishTimer();
  };

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

  // Filtered session history
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesCategory =
        selectedCategoryFilter === 'all' || s.category_id === selectedCategoryFilter;
      if (!matchesCategory) return false;

      const matchesSearch =
        s.task_name.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesSearch;
    });
  }, [sessions, selectedCategoryFilter, searchFilter]);

  // Extract unique categories from sessions
  const sessionCategories = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.category_id && s.category_name) {
        map.set(s.category_id, s.category_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  return (
    <div className="pb-12">
      <Header
        onToggleMobileMenu={() => {}}
        onOpenManualLog={() => setShowManualLog(true)}
        title="Timer & Sessions"
        subtitle="Focused execution, live time tracking, and chronological work logs"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-8">
        {/* Main Work Session Stopwatch Console */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left side: Task Selection & Status */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {activeTimer
                    ? activeTimer.is_running
                      ? 'Session in Progress'
                      : 'Session Paused'
                    : 'Ready to Track'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                  {activeTimer ? currentTask?.name : 'Start a Focused Session'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTimer
                    ? `Scoring rate: ${currentTask?.xp_rate} XP per ${
                        currentTask?.time_unit || 'hour'
                      }`
                    : 'Choose an activity and launch the digital timer. Paused time does not earn XP.'}
                </p>
              </div>

              {!activeTimer && (
                <div className="space-y-1.5 max-w-md">
                  <label className="text-xs font-medium text-foreground">
                    Select Activity
                  </label>
                  {activeTasks.length > 0 ? (
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
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
                  ) : (
                    <p className="text-xs text-amber-500">
                      No active tasks found. Create a task first in Activities.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right side: Digital Clock & Big Controls */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 rounded-xl border border-border/80 bg-background/50">
              <div className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-foreground select-none">
                {formatTimerClock(timerElapsed)}
              </div>

              {/* Earned XP Real-time preview */}
              <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span>Earned:</span>
                <span className="font-mono font-bold text-emerald-500">
                  +{formatXP(liveXP)} XP
                </span>
              </div>

              {/* Control Buttons */}
              <div className="mt-6 flex items-center gap-3">
                {!activeTimer ? (
                  <button
                    onClick={handleStart}
                    disabled={activeTasks.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-all"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start Session</span>
                  </button>
                ) : (
                  <>
                    {activeTimer.is_running ? (
                      <button
                        onClick={pauseTimer}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={resumeTimer}
                        className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Resume</span>
                      </button>
                    )}

                    <button
                      onClick={handleFinish}
                      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs"
                    >
                      <Square className="h-4 w-4 fill-current" />
                      <span>Finish & Save</span>
                    </button>

                    <button
                      onClick={discardTimer}
                      title="Discard session"
                      className="rounded-lg border border-border p-2.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Historical Session Logs Header & Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Session Log History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete audit trail of all recorded productive sessions and manual entries
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter sessions..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
              >
                <option value="all">All Categories</option>
                {sessionCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowManualLog(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Work</span>
              </button>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-foreground">No sessions match your filter</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start the timer or manually record a session to view history.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-medium">
                      <th className="py-3 px-4 font-medium">Date & Time</th>
                      <th className="py-3 px-4 font-medium">Activity</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium">Productive Duration / Count</th>
                      <th className="py-3 px-4 font-medium">Historical Rate</th>
                      <th className="py-3 px-4 font-medium">Earned XP</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSessions.map((session) => {
                      const sessionDate = new Date(session.ended_at);
                      return (
                        <tr
                          key={session.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            {sessionDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            <span className="text-[11px] opacity-75">
                              {sessionDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                            {session.task_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: session.category_color || '#6366f1' }}
                              />
                              {session.category_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-foreground whitespace-nowrap">
                            {session.scoring_method === 'time'
                              ? formatDurationHuman(session.duration_seconds)
                              : `${session.quantity} items`}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-mono whitespace-nowrap text-[11px]">
                            {session.scoring_method === 'time'
                              ? `${session.xp_rate} XP/${session.time_unit || 'hr'}`
                              : `${session.xp_rate} XP/ea`}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-500 whitespace-nowrap">
                            +{formatXP(session.xp_earned)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingSession(session)}
                                title="Edit Session"
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setSessionToDelete(session)}
                                title="Delete Session"
                                className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
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

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Session Record?"
        message={`Delete session for "${sessionToDelete?.task_name}" recorded on ${
          sessionToDelete ? new Date(sessionToDelete.ended_at).toLocaleDateString() : ''
        }? Associated XP will be removed from your totals.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}
