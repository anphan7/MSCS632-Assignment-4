// Employee shift scheduler (MSCS-632 Assignment 4, JavaScript version).
// Same rules as scheduler.py:
//  - one shift per employee per day
//  - at most MAX_DAYS (5) working days per employee per week
//  - at least MIN_PER_SHIFT (2) employees on every shift every day
//    (shortfalls are filled randomly from employees still under 5 days)
//  - conflicts (preferred shift full) -> another shift the same day,
//    otherwise the employee is moved to the next day
//  - bonus: ranked shift preferences per day
// Usage: node scheduler.js          (interactive)
//        node scheduler.js --demo   (fixed-seed example)
const readline = require("readline");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHIFTS = ["morning", "afternoon", "evening"];
const MAX_DAYS = 5;
const MIN_PER_SHIFT = 2;
const MAX_PER_SHIFT = 4; // a shift is "full" at this many employees

// Small seeded PRNG (mulberry32) so the demo output is reproducible.
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// prefs: { name: { dayIndex: [shift, ...ranked best first] } }
function buildSchedule(prefs, rng = Math.random) {
  const names = Object.keys(prefs);
  // schedule[day][shift] -> array of employee names
  const schedule = DAYS.map(() => Object.fromEntries(SHIFTS.map((s) => [s, []])));
  // days each employee has been scheduled (cap: MAX_DAYS)
  const daysWorked = Object.fromEntries(names.map((n) => [n, 0]));

  // true if the employee already has a shift that day (one shift/day rule)
  const worksOn = (emp, day) => SHIFTS.some((s) => schedule[day][s].includes(emp));
  // total working days still available across all employees
  const budgetLeft = () => names.reduce((sum, n) => sum + MAX_DAYS - daysWorked[n], 0);

  // Try ranked shifts, then any other open shift that day. Refuse a placement
  // that would starve today's unmet minimums or later days' minimums.
  function place(emp, day, ranked, reserve) {
    const budget = budgetLeft();
    const order = [...ranked, ...SHIFTS.filter((s) => !ranked.includes(s))];
    for (const shift of order) {
      const size = schedule[day][shift].length;
      // staff still missing to reach the minimum on today's shifts
      let deficit = SHIFTS.reduce(
        (sum, s) => sum + Math.max(0, MIN_PER_SHIFT - schedule[day][s].length), 0);
      if (size < MIN_PER_SHIFT) deficit -= 1;
      if (size < MAX_PER_SHIFT && budget - 1 >= reserve + deficit) {
        // shift has room and budget is safe -> assign
        schedule[day][shift].push(emp);
        daysWorked[emp] += 1;
        return true;
      }
    }
    return false;
  }

  // Pass 1: honour preferences day by day, fewest-days-worked first.
  // deferred[day]: employees bumped from the previous day by a full-shift conflict
  const deferred = DAYS.map(() => []);
  deferred.push([]);
  for (let day = 0; day < DAYS.length; day++) {
    const order = shuffle([...names], rng).sort((a, b) => daysWorked[a] - daysWorked[b]);
    const reserve = MIN_PER_SHIFT * SHIFTS.length * (DAYS.length - day - 1);
    for (const emp of [...order, ...deferred[day]]) {
      if (daysWorked[emp] >= MAX_DAYS || worksOn(emp, day)) continue;
      const ranked = prefs[emp][day] || SHIFTS;
      if (!place(emp, day, ranked, reserve)) deferred[day + 1].push(emp); // conflict
    }
  }

  // Pass 2: top up shifts below the minimum with random available staff.
  const warnings = [];
  for (let day = 0; day < DAYS.length; day++) {
    for (const shift of SHIFTS) {
      while (schedule[day][shift].length < MIN_PER_SHIFT) {
        // candidates: under the 5-day cap and not already working today
        const pool = names.filter((e) => daysWorked[e] < MAX_DAYS && !worksOn(e, day));
        if (pool.length === 0) {
          // impossible to staff -> report instead of crashing
          warnings.push(`${DAYS[day]} ${shift}: only ${schedule[day][shift].length} staff (no one available)`);
          break;
        }
        const emp = pool[Math.floor(rng() * pool.length)];
        schedule[day][shift].push(emp);
        daysWorked[emp] += 1;
      }
    }
  }
  return { schedule, warnings };
}

// one row per day, one column per shift
function printSchedule({ schedule, warnings }) {
  const width = 34;
  const total = 12 + 3 * width;
  console.log("\n" + "=".repeat(total));
  console.log("WEEKLY SCHEDULE".padStart((total + 15) / 2).padEnd(total));
  console.log("=".repeat(total));
  console.log(" ".repeat(12) + SHIFTS.map((s) => (s[0].toUpperCase() + s.slice(1)).padEnd(width)).join(""));
  console.log("-".repeat(total));
  DAYS.forEach((name, day) => {
    console.log(name.padEnd(12) + SHIFTS.map((s) => schedule[day][s].join(", ").padEnd(width)).join(""));
  });
  console.log("=".repeat(total));
  warnings.forEach((w) => console.log("WARNING:", w));
}

// sample data: 12 employees, each with a random shift ranking
function demoInput(rng) {
  const names = ["Alice", "Bob", "Carol", "Dave", "Erin", "Frank",
    "Grace", "Heidi", "Ivan", "Judy", "Mallory", "Niaj"];
  const prefs = {};
  for (const n of names) {
    const favourite = shuffle([...SHIFTS], rng);
    prefs[n] = Object.fromEntries(DAYS.map((_, d) => [d, [...favourite]]));
  }
  return prefs;
}

// keep asking for employees until a blank name is entered
async function interactiveInput() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  const prefs = {};
  for (;;) {
    const name = (await ask("\nEmployee name (blank to finish): ")).trim();
    if (!name) {
      if (Object.keys(prefs).length) break;
      continue;
    }
    if (prefs[name]) { console.log("Name already entered."); continue; }
    console.log(`\nPreferences for ${name}`);
    console.log("Enter shifts ranked best-first, e.g. 'm e a' or 'morning evening afternoon'.");
    console.log("Press Enter to reuse the previous day's answer.");
    // collect a ranked shift list for each day; Enter reuses the previous answer
    prefs[name] = {};
    let last = [...SHIFTS];
    for (let day = 0; day < DAYS.length; day++) {
      for (;;) {
        const tokens = (await ask(`  ${DAYS[day]}: `)).trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) { prefs[name][day] = last; break; }
        const ranked = [];
        for (const t of tokens) {
          const match = SHIFTS.filter((s) => s.startsWith(t));
          if (match.length === 1 && !ranked.includes(match[0])) ranked.push(match[0]);
        }
        if (ranked.length === tokens.length) { prefs[name][day] = last = ranked; break; }
        console.log("  Invalid input, try again.");
      }
    }
  }
  rl.close();
  return prefs;
}

(async () => {
  if (process.argv.includes("--demo")) {
    const rng = makeRng(632);
    printSchedule(buildSchedule(demoInput(rng), rng));
  } else {
    printSchedule(buildSchedule(await interactiveInput()));
  }
})();
