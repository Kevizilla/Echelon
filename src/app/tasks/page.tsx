'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Clock,
  Hash,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  FolderPlus,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Task, Category } from '@/types';
import { Repository } from '@/lib/repository';
import Header from '@/components/Header';
import TaskModal from '@/components/TaskModal';
import CategoryModal from '@/components/CategoryModal';
import ConfirmModal from '@/components/ConfirmModal';
import ManualLogModal from '@/components/ManualLogModal';

export default function TasksPage() {
  const { tasks, categories, startTimer, activeTimer, refreshData, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [manualLogTaskId, setManualLogTaskId] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesTab = tab === 'active' ? !task.is_archived : task.is_archived;
      if (!matchesTab) return false;

      const matchesCategory =
        selectedCategory === 'all' || task.category_id === selectedCategory;
      if (!matchesCategory) return false;

      const matchesSearch =
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tasks, tab, selectedCategory, searchQuery]);

  const handleToggleArchive = async (task: Task) => {
    try {
      await Repository.archiveTask(task.id, !task.is_archived);
      await refreshData();
      showToast(
        task.is_archived ? `Restored "${task.name}"` : `Archived "${task.name}"`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update task status', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await Repository.deleteTask(taskToDelete.id);
      await refreshData();
      showToast(`Deleted task "${taskToDelete.name}"`, 'info');
      setTaskToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete task', 'error');
    }
  };

  return (
    <div className="pb-12">
      <Header
        onToggleMobileMenu={() => {}}
        title="Activities & XP Rules"
        subtitle="Manage your trackable tasks, categories, and custom experience point scoring rules"
        actions={
          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Activity</span>
          </button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Active / Archived Tabs */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1 text-xs">
            <button
              onClick={() => setTab('active')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                tab === 'active'
                  ? 'bg-muted text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({tasks.filter((t) => !t.is_archived).length})
            </button>
            <button
              onClick={() => setTab('archived')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                tab === 'archived'
                  ? 'bg-muted text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Archived ({tasks.filter((t) => t.is_archived).length})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-1 max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setCategoryToEdit(null);
                setIsCategoryModalOpen(true);
              }}
              title="Add Category"
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Task Cards Grid */}
        {filteredTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              {tab === 'active' ? 'No active activities found' : 'No archived activities found'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search query or category filter.'
                : 'Create activities with custom XP rules to track your productivity.'}
            </p>
            {tab === 'active' && !searchQuery && (
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Activity</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              const cat = task.category;
              return (
                <div
                  key={task.id}
                  className={`rounded-lg border border-border bg-card p-5 shadow-xs flex flex-col justify-between transition-all hover:border-foreground/30 ${
                    task.is_archived ? 'opacity-70' : ''
                  }`}
                >
                  <div>
                    {/* Header: Category & Scoring Method Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat?.color || '#6366f1' }}
                        />
                        {cat?.name || 'General'}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {task.scoring_method === 'time' ? (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>Time-based</span>
                          </>
                        ) : (
                          <>
                            <Hash className="h-3 w-3" />
                            <span>Quantity-based</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Task Title & Description */}
                    <h3 className="text-base font-semibold text-foreground leading-snug">
                      {task.name}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Scoring Formula Box */}
                    <div className="mt-4 rounded-md border border-border/80 bg-background/60 p-2.5">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Scoring Rule
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-mono text-base font-bold text-foreground">
                          {task.xp_rate} XP
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.scoring_method === 'time'
                            ? `per ${task.time_unit || 'hour'}`
                            : 'per item'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {!task.is_archived && (
                        <>
                          <button
                            onClick={() => startTimer(task)}
                            disabled={!!activeTimer}
                            title="Start timer for this activity"
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Timer</span>
                          </button>
                          <button
                            onClick={() => setManualLogTaskId(task.id)}
                            title="Log past work"
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Log</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setTaskToEdit(task);
                          setIsTaskModalOpen(true);
                        }}
                        title="Edit activity"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleArchive(task)}
                        title={task.is_archived ? 'Restore activity' : 'Archive activity'}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {task.is_archived ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => setTaskToDelete(task)}
                        title="Delete activity"
                        className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
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

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
      />

      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Activity?"
        message={`Are you sure you want to delete "${taskToDelete?.name}"? Historical work sessions recorded under this task will preserve their activity name and earned XP.`}
        confirmLabel="Delete Activity"
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      {manualLogTaskId && (
        <ManualLogModal
          isOpen={!!manualLogTaskId}
          onClose={() => setManualLogTaskId(null)}
          defaultTaskId={manualLogTaskId}
        />
      )}
    </div>
  );
}
