# Employee Shift Scheduler

Schedules employees across 7 days and 3 shifts (morning, afternoon, evening).
Implemented twice: Python (`scheduler.py`) and JavaScript (`scheduler.js`).

Rules: one shift per employee per day, max 5 days per employee per week,
at least 2 employees on every shift. Shortfalls are filled randomly, and a full
preferred shift moves the employee to another shift that day (or the next day).
Bonus: shift preferences are ranked (1st, 2nd, 3rd).

## Requirements

- Python 3.8+ (no extra packages)
- Node.js 14+ (no extra packages)

## Run

Demo with 12 sample employees (fixed seed, same output every run):

```
python3 scheduler.py --demo
node scheduler.js --demo
```

Interactive mode (enter your own employees):

```
python3 scheduler.py
node scheduler.js
```

For each employee, type a name, then for each day enter shifts ranked
best-first, e.g. `m e a` (morning, evening, afternoon) or
`morning evening afternoon`. Press Enter to reuse the previous day's ranking.
Enter a blank name when done to see the schedule.

Note: with too few employees (roughly 8 or fewer) the minimum staffing cannot
be met, and the program prints a warning for each understaffed shift.
