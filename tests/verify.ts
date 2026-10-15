import { calculateXP, formatXP, formatDurationHuman, formatTimerClock } from '../src/lib/xp';

function runTests() {
  console.log('Running Echelon XP & Timing Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // Test 1: Competitive programming: 2 hours 30 mins at 2 XP per hour = 5 XP
  const tp1 = calculateXP({
    scoringMethod: 'time',
    xpRate: 2,
    durationSeconds: 9000, // 2.5 hours
    timeUnit: 'hour',
  });
  assert('Time-based (hour rate): 2.5h @ 2 XP/hr == 5 XP', tp1 === 5, `Got: ${tp1}`);

  // Test 2: Quantity-based: 5 problems @ 4 XP = 20 XP
  const qp1 = calculateXP({
    scoringMethod: 'quantity',
    xpRate: 4,
    quantity: 5,
  });
  assert('Quantity-based: 5 items @ 4 XP/item == 20 XP', qp1 === 20, `Got: ${qp1}`);

  // Test 3: Minute-based rate: 45 minutes @ 0.1 XP/min = 4.5 XP
  const mp1 = calculateXP({
    scoringMethod: 'time',
    xpRate: 0.1,
    durationSeconds: 2700, // 45 mins
    timeUnit: 'minute',
  });
  assert('Time-based (minute rate): 45m @ 0.1 XP/min == 4.5 XP', mp1 === 4.5, `Got: ${mp1}`);

  // Test 4: Negative duration or negative rate prevention
  const neg1 = calculateXP({
    scoringMethod: 'time',
    xpRate: -5,
    durationSeconds: 3600,
  });
  assert('Negative rate returns 0', neg1 === 0, `Got: ${neg1}`);

  const neg2 = calculateXP({
    scoringMethod: 'time',
    xpRate: 5,
    durationSeconds: -3600,
  });
  assert('Negative duration returns 0', neg2 === 0, `Got: ${neg2}`);

  // Test 5: Number formatting with up to two decimals, removing trailing zeros
  assert('formatXP(5.00) -> "5"', formatXP(5) === '5', `Got: ${formatXP(5)}`);
  assert('formatXP(5.20) -> "5.2"', formatXP(5.2) === '5.2', `Got: ${formatXP(5.2)}`);
  assert('formatXP(5.25) -> "5.25"', formatXP(5.25) === '5.25', `Got: ${formatXP(5.25)}`);
  assert('formatXP(5.256) -> "5.26"', formatXP(5.256) === '5.26', `Got: ${formatXP(5.256)}`);
  assert('formatXP(0) -> "0"', formatXP(0) === '0', `Got: ${formatXP(0)}`);

  // Test 6: formatDurationHuman
  assert('formatDurationHuman(9000) -> "2h 30m"', formatDurationHuman(9000) === '2h 30m', `Got: ${formatDurationHuman(9000)}`);
  assert('formatDurationHuman(2700) -> "45m"', formatDurationHuman(2700) === '45m', `Got: ${formatDurationHuman(2700)}`);
  assert('formatDurationHuman(45) -> "45s"', formatDurationHuman(45) === '45s', `Got: ${formatDurationHuman(45)}`);

  // Test 7: formatTimerClock
  assert('formatTimerClock(65) -> "01:05"', formatTimerClock(65) === '01:05', `Got: ${formatTimerClock(65)}`);
  assert('formatTimerClock(3665) -> "01:01:05"', formatTimerClock(3665) === '01:01:05', `Got: ${formatTimerClock(3665)}`);

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
