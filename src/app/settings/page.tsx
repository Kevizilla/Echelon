'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Database,
  Palette,
  FolderPlus,
  Edit2,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  ExternalLink,
  LogOut,
  LogIn,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Category } from '@/types';
import { Repository } from '@/lib/repository';
import Header from '@/components/Header';
import CategoryModal from '@/components/CategoryModal';
import ConfirmModal from '@/components/ConfirmModal';

export default function SettingsPage() {
  const {
    user,
    theme,
    toggleTheme,
    isSupabaseMode,
    categories,
    tasks,
    sessions,
    refreshData,
    showToast,
    updateProfile,
    signOut,
  } = useApp();

  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingName(true);
    try {
      const ok = await updateProfile(nameInput);
      if (ok) {
        showToast('Profile updated successfully');
        setIsEditingName(false);
      } else {
        showToast('Failed to update profile', 'error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      showToast(message, 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      showToast('Signed out successfully', 'info');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      showToast(message, 'error');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await Repository.deleteCategory(categoryToDelete.id);
      await refreshData();
      showToast(`Category "${categoryToDelete.name}" deleted`, 'info');
      setCategoryToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category', 'error');
    }
  };

  const handleExportData = () => {
    const data = {
      user,
      categories,
      tasks,
      sessions,
      exportedAt: new Date().toISOString(),
      app: 'Echelon Productivity XP',
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echelon-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Productivity data exported successfully');
  };

  const handleResetDemoData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('echelon_tasks');
      localStorage.removeItem('echelon_categories');
      localStorage.removeItem('echelon_sessions');
      localStorage.removeItem('echelon_active_timer');
      refreshData();
      showToast('Sample data reset to initial baseline', 'info');
    }
  };

  return (
    <div className="pb-12">
      <Header
        onToggleMobileMenu={() => {}}
        title="Settings"
        subtitle="Manage categories, appearance, database integration, and local backups"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Account & Profile */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Profile & Account</h3>
                <p className="text-xs text-muted-foreground">
                  {user ? 'Authenticated user profile and account details' : 'Supabase authentication and account status'}
                </p>
              </div>
            </div>

            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            ) : null}
          </div>

          {user ? (
            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Display Name</span>
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your display name"
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                        disabled={isSavingName}
                      />
                      <button
                        type="submit"
                        disabled={isSavingName}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        title="Save"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        disabled={isSavingName}
                        className="inline-flex items-center justify-center rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={`font-medium ${user.display_name ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                        {user.display_name || 'No display name set'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(user.display_name || '');
                          setIsEditingName(true);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        title="Edit display name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-muted-foreground">Email Address</span>
                  <p className="font-medium text-foreground mt-0.5 font-mono">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50 text-[11px]">
                <div>
                  <span className="text-muted-foreground">User ID</span>
                  <p className="font-mono text-muted-foreground truncate mt-0.5" title={user.id}>
                    {user.id}
                  </p>
                </div>
                {user.created_at ? (
                  <div>
                    <span className="text-muted-foreground">Member Since</span>
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">Signed Out</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in or create an account to persist your tasks, categories, and XP to Supabase.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span>Sign Up</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Database & Cloud Sync Status */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Supabase & Database Storage</h3>
                <p className="text-xs text-muted-foreground">
                  PostgreSQL database with Row Level Security (RLS)
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isSupabaseMode
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              {isSupabaseMode ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  <span>Connected to Supabase</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  <span>Local Persistence Mode</span>
                </>
              )}
            </span>
          </div>

          <div className="mt-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
            {isSupabaseMode ? (
              <p className="text-emerald-500/90 font-medium">
                Your application is connected to your Supabase PostgreSQL instance. All tasks,
                categories, work sessions, and active timers are securely isolated with Row Level
                Security (RLS).
              </p>
            ) : (
              <div>
                <p>
                  The app is currently running in local persistence mode with complete client-side storage.
                  To connect your Supabase PostgreSQL cloud database:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 font-mono text-[11px] bg-muted/60 p-3 rounded-md border border-border">
                  <li>Run the schema provided in <code className="text-foreground">supabase/schema.sql</code> in your Supabase SQL Editor.</li>
                  <li>Add your keys to <code className="text-foreground">.env.local</code>:</li>
                  <li className="pl-4 list-none text-foreground font-semibold">
                    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co<br />
                    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Categories Management */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Custom Categories</h3>
                <p className="text-xs text-muted-foreground">
                  Create and manage color-coded activity categories
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setCategoryToEdit(null);
                setShowCategoryModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="font-medium text-foreground">{c.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCategoryToEdit(c);
                      setShowCategoryModal(true);
                    }}
                    title="Edit category"
                    className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(c)}
                    title="Delete category"
                    className="p-1 rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appearance & Theme */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Switch between minimalist Dark and Light theme
              </p>
            </div>

            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data Backup & Reset */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground mb-1">Data Management</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Export a full JSON archive of all activities, categories, and sessions.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export All Data (JSON)</span>
            </button>

            <button
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Initial Baseline Data</span>
            </button>
          </div>
        </div>
      </div>

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
      />

      <ConfirmModal
        isOpen={!!categoryToDelete}
        title="Delete Category?"
        message={`Delete category "${categoryToDelete?.name}"? Tasks in this category will become Uncategorized.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
