'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatTimerClock, formatXP, calculateXP } from '@/lib/xp';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';

export default function ActiveTimerBanner() {
  const { activeTimer, timerElapsed, tasks, pauseTimer, resumeTimer, finishTimer } = useApp();

  if (!activeTimer) return null;

  const task = tasks.find((t) => t.id === activeTimer.task_id) || activeTimer.task;
  const isRunning = activeTimer.is_running;

  const currentXP = task
    ? calculateXP({
        scoringMethod: task.scoring_method,
        xpRate: task.xp_rate,
        durationSeconds: timerElapsed,
        timeUnit: task.time_unit,
      })
    : 0;

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur px-4 py-2.5 transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
              isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isRunning ? 'Timer Running' : 'Timer Paused'}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="truncate text-sm font-medium text-foreground">
                {task?.name || 'Session in Progress'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 text-right">
            <span className="font-mono text-base font-semibold text-foreground">
              {formatTimerClock(timerElapsed)}
            </span>
            <span className="hidden sm:inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{formatXP(currentXP)} XP
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isRunning ? (
              <button
                onClick={pauseTimer}
                title="Pause Timer"
                className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pause className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                title="Resume Timer"
                className="rounded-md border border-border p-1.5 text-emerald-500 hover:bg-muted transition-colors"
              >
                <Play className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => finishTimer()}
              title="Finish & Save Session"
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Finish</span>
            </button>

            <Link
              href="/sessions"
              title="Open full session view"
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
