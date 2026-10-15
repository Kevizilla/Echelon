'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Timer,
  Calendar,
  BarChart3,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SidebarProps {
  onOpenManualLog?: () => void;
  onOpenNewTask?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  onOpenManualLog,
  onOpenNewTask,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme, user, isSupabaseMode } = useApp();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Timer & Sessions', href: '/sessions', icon: Timer },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight">Echelon</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase font-medium">
                Productivity XP
              </span>
            </div>
          </Link>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          {onOpenManualLog && (
            <button
              onClick={() => {
                onOpenManualLog();
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Work</span>
            </button>
          )}

          {onOpenNewTask && (
            <button
              onClick={() => {
                onOpenNewTask();
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-muted text-foreground font-semibold border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status indicator & User footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-semibold text-foreground">
                {user ? user.display_name || user.email : 'Signed Out'}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {user ? user.email : (isSupabaseMode ? 'Sign in to sync' : 'Offline mode')}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isSupabaseMode && user
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border border-border'
              }`}
            >
              {isSupabaseMode ? (user ? 'Supabase' : 'Signed Out') : 'Offline Mode'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
