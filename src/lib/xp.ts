import { ScoringMethod, TimeUnit } from '@/types';

export interface CalculateXPParams {
  scoringMethod: ScoringMethod;
  xpRate: number;
  durationSeconds?: number;
  timeUnit?: TimeUnit;
  quantity?: number | null;
}

/**
 * Calculates XP earned based on scoring method, rate, and duration or quantity.
 * Store sufficient precision internally (number) and ensure non-negative output.
 */
export function calculateXP({
  scoringMethod,
  xpRate,
  durationSeconds = 0,
  timeUnit = 'hour',
  quantity = 0,
}: CalculateXPParams): number {
  if (xpRate < 0) return 0;

  let earned = 0;

  if (scoringMethod === 'time') {
    const validDuration = Math.max(0, durationSeconds);
    if (timeUnit === 'minute') {
      const minutes = validDuration / 60;
      earned = minutes * xpRate;
    } else {
      const hours = validDuration / 3600;
      earned = hours * xpRate;
    }
  } else if (scoringMethod === 'quantity') {
    const validQuantity = Math.max(0, quantity || 0);
    earned = validQuantity * xpRate;
  }

  // Round internally to 4 decimal places for precision without floating point noise
  return Math.round(Math.max(0, earned) * 10000) / 10000;
}

/**
 * Formats XP for display: up to two decimal places, removing unnecessary trailing zeros.
 * Examples:
 * 5.00 -> "5"
 * 5.20 -> "5.2"
 * 5.25 -> "5.25"
 * 0.00 -> "0"
 */
export function formatXP(xp: number): string {
  if (isNaN(xp) || xp === 0) return '0';
  const rounded = Math.round(xp * 100) / 100;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Formats duration in seconds to a human-readable string (e.g. "2h 30m", "45m", "30s").
 */
export function formatDurationHuman(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (parts.length === 0 && secs > 0) parts.push(`${secs}s`);
  if (parts.length === 0) parts.push('0m');

  return parts.join(' ');
}

/**
 * Formats duration in seconds for digital timer display (HH:MM:SS or MM:SS).
 */
export function formatTimerClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
