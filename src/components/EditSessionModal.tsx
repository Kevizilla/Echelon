'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Trash2 } from 'lucide-react';
import { WorkSession } from '@/types';
import { Repository } from '@/lib/repository';
import { useApp } from '@/context/AppContext';
import { calculateXP, formatXP } from '@/lib/xp';
import ConfirmModal from './ConfirmModal';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkSession | null;
}

export default function EditSessionModal({
  isOpen,
  onClose,
  session,
}: EditSessionModalProps) {
  const { refreshData, showToast } = useApp();
  const [sessionDate, setSessionDate] = useState('');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [xpRate, setXpRate] = useState('2');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (session && isOpen) {
      const d = new Date(session.ended_at);
      setSessionDate(d.toISOString().split('T')[0]);
      const hrs = Math.floor(session.duration_seconds / 3600);
      const mins = Math.floor((session.duration_seconds % 3600) / 60);
      setDurationHours(hrs.toString());
      setDurationMinutes(mins.toString());
      setQuantity(session.quantity !== null ? session.quantity.toString() : '1');
      setXpRate(session.xp_rate.toString());
      setError('');
    }
  }, [session, isOpen]);

  const totalSeconds = useMemo(() => {
    const h = parseInt(durationHours, 10) || 0;
    const m = parseInt(durationMinutes, 10) || 0;
    return Math.max(0, h * 3600 + m * 60);
  }, [durationHours, durationMinutes]);

  const previewXP = useMemo(() => {
    if (!session) return 0;
    const rate = parseFloat(xpRate) || session.xp_rate;
    return calculateXP({
      scoringMethod: session.scoring_method,
      xpRate: rate,
      durationSeconds: totalSeconds,
      timeUnit: session.time_unit,
      quantity: parseFloat(quantity) || 0,
    });
  }, [session, xpRate, totalSeconds, quantity]);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rateNum = parseFloat(xpRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setError('XP Rate must be non-negative.');
      return;
    }

    if (session.scoring_method === 'time' && totalSeconds <= 0) {
      setError('Duration must be greater than 0.');
      return;
    }

    if (session.scoring_method === 'quantity') {
      const q = parseFloat(quantity);
      if (isNaN(q) || q <= 0) {
        setError('Quantity must be greater than 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Recompute dates preserving time of day
      const existingDate = new Date(session.ended_at);
      const [year, month, day] = sessionDate.split('-').map(Number);
      existingDate.setFullYear(year, month - 1, day);

      const newEnd = existingDate.toISOString();
      const newStart = new Date(
        existingDate.getTime() - (session.scoring_method === 'time' ? totalSeconds * 1000 : 0)
      ).toISOString();

      await Repository.updateSession(session.id, {
        duration_seconds: session.scoring_method === 'time' ? totalSeconds : 0,
        quantity: session.scoring_method === 'quantity' ? parseFloat(quantity) : null,
        xp_rate: rateNum,
        started_at: newStart,
        ended_at: newEnd,
      });

      await refreshData();
      showToast('Session updated successfully', 'success');
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Failed to update session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await Repository.deleteSession(session.id);
      await refreshData();
      showToast('Session deleted', 'info');
      setShowConfirmDelete(false);
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete session', 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-foreground">Edit Work Session</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Activity: <span className="font-medium text-foreground">{session.task_name}</span>
              </p>
            </div>
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
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>

            {session.scoring_method === 'time' ? (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Recorded Duration
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
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Saved XP Rate ({session.scoring_method === 'time' ? `per ${session.time_unit || 'hr'}` : 'per item'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={xpRate}
                onChange={(e) => setXpRate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Editing this adjusts only this session’s rate without altering other sessions or the base task template.
              </p>
            </div>

            {/* Live Recalculated XP */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span>Recalculated XP:</span>
              </div>
              <div className="font-mono text-base font-bold text-foreground">
                {formatXP(previewXP)} XP
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Session</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Work Session?"
        message={`Are you sure you want to delete this session for "${session.task_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
}
