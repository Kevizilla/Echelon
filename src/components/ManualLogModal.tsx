'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Repository } from '@/lib/repository';
import { calculateXP, formatXP } from '@/lib/xp';

interface ManualLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTaskId?: string;
}

export default function ManualLogModal({
  isOpen,
  onClose,
  defaultTaskId,
}: ManualLogModalProps) {
  const { tasks, categories, refreshData, showToast } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active tasks only
  const activeTasks = useMemo(() => tasks.filter((t) => !t.is_archived), [tasks]);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setSessionDate(now.toISOString().split('T')[0]);
      setSessionTime(
        now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
      );
      if (defaultTaskId) {
        setSelectedTaskId(defaultTaskId);
      } else if (activeTasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(activeTasks[0].id);
      }
      setDurationHours('1');
      setDurationMinutes('0');
      setQuantity('1');
      setError('');
    }
  }, [isOpen, defaultTaskId, activeTasks, selectedTaskId]);

  const selectedTask = useMemo(
    () => activeTasks.find((t) => t.id === selectedTaskId),
    [activeTasks, selectedTaskId]
  );

  const totalSeconds = useMemo(() => {
    const h = parseInt(durationHours, 10) || 0;
    const m = parseInt(durationMinutes, 10) || 0;
    return Math.max(0, h * 3600 + m * 60);
  }, [durationHours, durationMinutes]);

  const previewXP = useMemo(() => {
    if (!selectedTask) return 0;
    return calculateXP({
      scoringMethod: selectedTask.scoring_method,
      xpRate: selectedTask.xp_rate,
      durationSeconds: totalSeconds,
      timeUnit: selectedTask.time_unit,
      quantity: parseFloat(quantity) || 0,
    });
  }, [selectedTask, totalSeconds, quantity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTask) {
      setError('Please select an active activity.');
      return;
    }

    if (!sessionDate || !sessionTime) {
      setError('Please specify both date and time.');
      return;
    }

    if (selectedTask.scoring_method === 'time' && totalSeconds <= 0) {
      setError('Duration must be greater than 0.');
      return;
    }

    if (selectedTask.scoring_method === 'quantity') {
      const q = parseFloat(quantity);
      if (isNaN(q) || q <= 0) {
        setError('Quantity must be a positive number greater than 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Calculate start and end date
      const endDateTime = new Date(`${sessionDate}T${sessionTime}:00`);
      const startDateTime = new Date(
        endDateTime.getTime() - (selectedTask.scoring_method === 'time' ? totalSeconds * 1000 : 0)
      );

      const category = categories.find((c) => c.id === selectedTask.category_id);

      const created = await Repository.createSession({
        task_id: selectedTask.id,
        category_id: selectedTask.category_id,
        task_name: selectedTask.name,
        category_name: category ? category.name : 'General',
        category_color: category ? category.color : '#6366f1',
        scoring_method: selectedTask.scoring_method,
        time_unit: selectedTask.time_unit,
        xp_rate: selectedTask.xp_rate,
        duration_seconds: selectedTask.scoring_method === 'time' ? totalSeconds : 0,
        quantity: selectedTask.scoring_method === 'quantity' ? parseFloat(quantity) : null,
        xp_earned: previewXP,
        started_at: startDateTime.toISOString(),
        ended_at: endDateTime.toISOString(),
      });

      await refreshData();
      showToast(`Logged session for "${selectedTask.name}" (+${formatXP(created.xp_earned)} XP)`);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Failed to log session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Log Completed Work</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-500">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Select Activity *
            </label>
            {activeTasks.length === 0 ? (
              <p className="text-xs text-amber-500">
                No active tasks found. Please create a task first.
              </p>
            ) : (
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
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Time</label>
              <input
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          </div>

          {selectedTask?.scoring_method === 'time' ? (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Duration
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                  <span className="text-xs text-muted-foreground">hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                  <span className="text-xs text-muted-foreground">mins</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Completed Quantity
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 5"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          )}

          {/* XP Calculation Preview Badge */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>Calculated XP Earned:</span>
            </div>
            <div className="font-mono text-base font-bold text-foreground">
              +{formatXP(previewXP)} XP
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || activeTasks.length === 0}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Work Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
