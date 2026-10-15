'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Category } from '@/types';
import { Repository } from '@/lib/repository';
import { useApp } from '@/context/AppContext';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export default function CategoryModal({ isOpen, onClose, categoryToEdit }: CategoryModalProps) {
  const { refreshData, showToast } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setColor(categoryToEdit.color);
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
    }
    setError('');
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (categoryToEdit) {
        await Repository.updateCategory(categoryToEdit.id, { name: name.trim(), color });
        showToast('Category updated successfully');
      } else {
        await Repository.createCategory(name.trim(), color);
        showToast('Category created successfully');
      }
      await refreshData();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {categoryToEdit ? 'Edit Category' : 'New Category'}
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
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research, Languages"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  {color === c && <Check className="h-4 w-4 text-white stroke-[3]" />}
                </button>
              ))}
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
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? 'Saving...' : categoryToEdit ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
