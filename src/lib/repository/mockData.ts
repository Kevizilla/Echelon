import { Category, Task, WorkSession } from '@/types';
import { calculateXP } from '@/lib/xp';

export const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  display_name: 'Productivity User',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    user_id: DEMO_USER.id,
    name: 'Coding',
    color: '#10b981', // emerald
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'cat-2',
    user_id: DEMO_USER.id,
    name: 'Study',
    color: '#3b82f6', // blue
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'cat-3',
    user_id: DEMO_USER.id,
    name: 'Health',
    color: '#f59e0b', // amber
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'cat-4',
    user_id: DEMO_USER.id,
    name: 'Personal Development',
    color: '#8b5cf6', // purple
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    user_id: DEMO_USER.id,
    category_id: 'cat-1',
    name: 'Competitive Programming',
    description: 'Solve algorithm puzzles and contest questions',
    scoring_method: 'time',
    time_unit: 'hour',
    xp_rate: 2.0,
    is_archived: false,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'task-2',
    user_id: DEMO_USER.id,
    category_id: 'cat-1',
    name: 'Solve Coding Problems',
    description: 'Quantity-based problem practice on LeetCode/Codeforces',
    scoring_method: 'quantity',
    time_unit: 'hour',
    xp_rate: 4.0, // 4 XP per problem
    is_archived: false,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'task-3',
    user_id: DEMO_USER.id,
    category_id: 'cat-2',
    name: 'Distributed Systems Reading',
    description: 'Reading DDIA and paper reviews',
    scoring_method: 'time',
    time_unit: 'hour',
    xp_rate: 3.5,
    is_archived: false,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'task-4',
    user_id: DEMO_USER.id,
    category_id: 'cat-3',
    name: 'Calisthenics & Mobility',
    description: 'Core training, pullups, stretching routines',
    scoring_method: 'time',
    time_unit: 'minute',
    xp_rate: 0.1, // 0.1 XP per min (6 XP/hour)
    is_archived: false,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'task-5',
    user_id: DEMO_USER.id,
    category_id: 'cat-4',
    name: 'Vocabulary Flashcards',
    description: 'Daily Spaced Repetition decks',
    scoring_method: 'quantity',
    time_unit: 'hour',
    xp_rate: 0.25, // 0.25 XP per card deck
    is_archived: false,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export function generateInitialSessions(): WorkSession[] {
  const sessions: WorkSession[] = [];
  const now = new Date();

  // Helper to make date N days ago at H hours
  const makeDate = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // Past days sessions
  const sessionDefs = [
    {
      daysAgo: 6,
      task: INITIAL_TASKS[0],
      durationSec: 9000, // 2h 30m
      startH: 10,
    },
    {
      daysAgo: 5,
      task: INITIAL_TASKS[1],
      quantity: 5,
      durationSec: 3600,
      startH: 14,
    },
    {
      daysAgo: 4,
      task: INITIAL_TASKS[2],
      durationSec: 5400, // 1h 30m
      startH: 16,
    },
    {
      daysAgo: 3,
      task: INITIAL_TASKS[3],
      durationSec: 2700, // 45m
      startH: 8,
    },
    {
      daysAgo: 2,
      task: INITIAL_TASKS[0],
      durationSec: 7200, // 2h
      startH: 11,
    },
    {
      daysAgo: 1,
      task: INITIAL_TASKS[1],
      quantity: 4,
      durationSec: 3000,
      startH: 15,
    },
    {
      daysAgo: 0,
      task: INITIAL_TASKS[2],
      durationSec: 3600, // 1h
      startH: 9,
    },
  ];

  sessionDefs.forEach((def, idx) => {
    const start = makeDate(def.daysAgo, def.startH, 0);
    const end = new Date(start.getTime() + (def.durationSec || 3600) * 1000);
    const cat = INITIAL_CATEGORIES.find((c) => c.id === def.task.category_id);

    const xpEarned = calculateXP({
      scoringMethod: def.task.scoring_method,
      xpRate: def.task.xp_rate,
      durationSeconds: def.durationSec,
      timeUnit: def.task.time_unit,
      quantity: def.quantity || null,
    });

    sessions.push({
      id: `session-mock-${idx + 1}`,
      user_id: DEMO_USER.id,
      task_id: def.task.id,
      category_id: def.task.category_id,
      task_name: def.task.name,
      category_name: cat ? cat.name : 'General',
      category_color: cat ? cat.color : '#6366f1',
      scoring_method: def.task.scoring_method,
      time_unit: def.task.time_unit,
      xp_rate: def.task.xp_rate,
      duration_seconds: def.durationSec,
      quantity: def.quantity ?? null,
      xp_earned: xpEarned,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      created_at: end.toISOString(),
      updated_at: end.toISOString(),
    });
  });

  return sessions;
}
