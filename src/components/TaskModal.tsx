'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, Hash } from 'lucide-react';
import { Task, ScoringMethod, TimeUnit } from '@/types';
import { Repository } from '@/lib/repository';
import { useApp } from '@/context/AppContext';
import CategoryModal from './CategoryModal';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

export default function TaskModal({ isOpen, onClose, taskToEdit }: TaskModalProps) {
  const { categories, refreshData, showToast } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>('time');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('hour');
  const [xpRate, setXpRate] = useState<string>('2');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name);
      setDescription(taskToEdit.description || '');
      setCategoryId(taskToEdit.category_id || (categories[0]?.id || ''));
      setScoringMethod(taskToEdit.scoring_method);
      setTimeUnit(taskToEdit.time_unit || 'hour');
      setXpRate(taskToEdit.xp_rate.toString());
    } else {
      setName('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      setScoringMethod('time');
      setTimeUnit('hour');
      setXpRate('2');
    }
    setError('');
  }, [taskToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Task name is required.');
      return;
    }

    const rateNum = parseFloat(xpRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setError('XP Rate must be a positive number greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        scoring_method: scoringMethod,
        time_unit: scoringMethod === 'time' ? timeUnit : 'hour',
        xp_rate: rateNum,
        is_archived: taskToEdit ? taskToEdit.is_archived : false,
      };

      if (taskToEdit) {
        await Repository.updateTask(taskToEdit.id, payload);
        showToast('Task updated successfully');
      } else {
        await Repository.createTask(payload);
        showToast('Task created successfully');
      }
      await refreshData();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              {taskToEdit ? 'Edit Activity' : 'Create New Activity'}
            </h2>
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
                Activity Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Competitive Programming, Reading, HIIT"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context, target milestones, or reference links..."
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">Category</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Category</span>
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scoring method selection */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Scoring Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScoringMethod('time')}
                  className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                    scoringMethod === 'time'
                      ? 'border-foreground bg-muted text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Time-Based</div>
                    <div className="text-[11px] text-muted-foreground">XP proportional to elapsed time</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScoringMethod('quantity')}
                  className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                    scoringMethod === 'quantity'
                      ? 'border-foreground bg-muted text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Quantity-Based</div>
                    <div className="text-[11px] text-muted-foreground">XP per completed unit or problem</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Scoring rate parameters */}
            {scoringMethod === 'time' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Rate Unit
                  </label>
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  >
                    <option value="hour">Per Hour</option>
                    <option value="minute">Per Minute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    XP Rate ({timeUnit === 'hour' ? 'per hr' : 'per min'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={xpRate}
                    onChange={(e) => setXpRate(e.target.value)}
                    placeholder="2.0"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  XP per Completed Item
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={xpRate}
                  onChange={(e) => setXpRate(e.target.value)}
                  placeholder="4.0"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>
            )}

            <div className="rounded-md border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Scoring Example: </span>
              {scoringMethod === 'time' ? (
                timeUnit === 'hour' ? (
                  <span>
                    Working 2 hours 30 mins at {xpRate || 0} XP/hr awards{' '}
                    <span className="font-medium text-foreground">
                      {(2.5 * (parseFloat(xpRate) || 0)).toFixed(2)} XP
                    </span>
                    .
                  </span>
                ) : (
                  <span>
                    Working 45 mins at {xpRate || 0} XP/min awards{' '}
                    <span className="font-medium text-foreground">
                      {(45 * (parseFloat(xpRate) || 0)).toFixed(2)} XP
                    </span>
                    .
                  </span>
                )
              ) : (
                <span>
                  Completing 5 units at {xpRate || 0} XP each awards{' '}
                  <span className="font-medium text-foreground">
                    {(5 * (parseFloat(xpRate) || 0)).toFixed(2)} XP
                  </span>
                  .
                </span>
              )}
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
                disabled={submitting}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? 'Saving...' : taskToEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </>
  );
}
