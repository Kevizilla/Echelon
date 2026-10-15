'use client';

import React from 'react';
import { Menu, Plus, Timer as TimerIcon } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenManualLog?: () => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({
  onToggleMobileMenu,
  onOpenManualLog,
  title,
  subtitle,
  actions,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Link
            href="/sessions"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <TimerIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Timer</span>
          </Link>
          {onOpenManualLog && (
            <button
              onClick={onOpenManualLog}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Work</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
