// Echelon XP & Timing Calculation Verification Suite

function calculateXP({
  scoringMethod,
  xpRate,
  durationSeconds = 0,
  timeUnit = 'hour',
  quantity = 0,
}) {
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
  return Math.round(Math.max(0, earned) * 10000) / 10000;
}

function formatXP(xp) {
  if (isNaN(xp) || xp === 0) return '0';
  const rounded = Math.round(xp * 100) / 100;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}

function formatDurationHuman(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (parts.length === 0 && secs > 0) parts.push(`${secs}s`);
  if (parts.length === 0) parts.push('0m');

  return parts.join(' ');
}

function formatTimerClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

console.log('--- Testing Echelon Core Logic & Invariants ---\n');
let passed = 0;
let failed = 0;

function assert(name, condition, details) {
  if (condition) {
    console.log(`✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${name} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

// 1. Time-based proportional XP (hour rate)
const t1 = calculateXP({
  scoringMethod: 'time',
  xpRate: 2,
  durationSeconds: 9000, // 2 hours 30 mins
  timeUnit: 'hour',
});
assert('Time-based 2.5 hours @ 2 XP/hr == 5 XP', t1 === 5, `Got ${t1}`);

// 2. Quantity-based proportional XP
const q1 = calculateXP({
  scoringMethod: 'quantity',
  xpRate: 4,
  quantity: 5,
});
assert('Quantity-based 5 items @ 4 XP/item == 20 XP', q1 === 20, `Got ${q1}`);

// 3. Minute-based rate
const m1 = calculateXP({
  scoringMethod: 'time',
  xpRate: 0.1,
  durationSeconds: 2700, // 45 mins
  timeUnit: 'minute',
});
assert('Minute-based 45 mins @ 0.1 XP/min == 4.5 XP', m1 === 4.5, `Got ${m1}`);

// 4. Zero and negative inputs
assert('Negative rate prevented', calculateXP({ scoringMethod: 'time', xpRate: -2, durationSeconds: 3600 }) === 0);
assert('Negative duration prevented', calculateXP({ scoringMethod: 'time', xpRate: 2, durationSeconds: -3600 }) === 0);
assert('Negative quantity prevented', calculateXP({ scoringMethod: 'quantity', xpRate: 2, quantity: -5 }) === 0);

// 5. Display formatting rules (up to 2 decimals, no unnecessary trailing zeros)
assert('formatXP(5) -> "5"', formatXP(5) === '5');
assert('formatXP(5.2) -> "5.2"', formatXP(5.2) === '5.2');
assert('formatXP(5.25) -> "5.25"', formatXP(5.25) === '5.25');
assert('formatXP(5.256) -> "5.26"', formatXP(5.256) === '5.26');
assert('formatXP(0) -> "0"', formatXP(0) === '0');

// 6. Formatting durations
assert('formatDurationHuman(9000) -> "2h 30m"', formatDurationHuman(9000) === '2h 30m');
assert('formatDurationHuman(2700) -> "45m"', formatDurationHuman(2700) === '45m');
assert('formatDurationHuman(45) -> "45s"', formatDurationHuman(45) === '45s');

// 7. Timer display clock
assert('formatTimerClock(65) -> "01:05"', formatTimerClock(65) === '01:05');
assert('formatTimerClock(3665) -> "01:01:05"', formatTimerClock(3665) === '01:01:05');

console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
