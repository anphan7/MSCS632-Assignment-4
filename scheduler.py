"""Employee shift scheduler (MSCS-632 Assignment 4, Python version).

Rules enforced:
  * one shift per employee per day
  * at most MAX_DAYS (5) working days per employee per week
  * at least MIN_PER_SHIFT (2) employees on every shift every day
    (shortfalls are filled randomly from employees still under 5 days)
  * conflicts (preferred shift full) are resolved by moving the employee to
    another shift the same day, otherwise to a shift on the next day
Bonus: each employee gives a ranked preference (1st, 2nd, 3rd) per day.
"""
import random
import sys

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SHIFTS = ["morning", "afternoon", "evening"]
MAX_DAYS = 5
MIN_PER_SHIFT = 2
MAX_PER_SHIFT = 4  # capacity: a shift is "full" at this many employees


def build_schedule(prefs, rng=random):
    """prefs: {employee: {day_index: [shift, shift, shift]}} (ranked, best first).

    Returns (schedule, warnings) where schedule[day][shift] is a list of names.
    """
    # schedule[day][shift] -> list of employee names
    schedule = [{s: [] for s in SHIFTS} for _ in DAYS]
    # running count of days each employee has been scheduled (cap: MAX_DAYS)
    days_worked = {e: 0 for e in prefs}

    def works_on(emp, day):
        # True if the employee already has a shift that day (one shift/day rule)
        return any(emp in schedule[day][s] for s in SHIFTS)

    def place(emp, day, ranked, reserve):
        """Try ranked shifts on `day`; fall back to any open shift that day.

        A placement is refused if it would leave too little 5-day budget for
        today's unmet shift minimums plus the minimums of the later days.
        """
        # total working days still available across all employees
        budget = sum(MAX_DAYS - w for w in days_worked.values())
        for shift in ranked + [s for s in SHIFTS if s not in ranked]:
            size = len(schedule[day][shift])
            # staff still missing to reach the minimum on today's shifts
            deficit = sum(max(0, MIN_PER_SHIFT - len(schedule[day][s])) for s in SHIFTS)
            if size < MIN_PER_SHIFT:
                deficit -= 1
            if size < MAX_PER_SHIFT and budget - 1 >= reserve + deficit:
                # shift has room and budget is safe -> assign
                schedule[day][shift].append(emp)
                days_worked[emp] += 1
                return True
        return False

    # Pass 1: honour preferences day by day. Employees with the fewest days
    # worked go first (random tie-break) so the 5-day cap is shared fairly.
    deferred = {d: [] for d in range(len(DAYS) + 1)}
    for day in range(len(DAYS)):
        order = list(prefs)
        rng.shuffle(order)
        order.sort(key=lambda e: days_worked[e])
        # Keep enough 5-day budget for the minimum staffing of later days.
        reserve = MIN_PER_SHIFT * len(SHIFTS) * (len(DAYS) - day - 1)
        for emp in order + deferred[day]:
            if days_worked[emp] >= MAX_DAYS or works_on(emp, day):
                continue
            ranked = prefs[emp].get(day, SHIFTS)
            if not place(emp, day, ranked, reserve):
                # every shift today is full -> conflict, try the next day
                deferred[day + 1].append(emp)

    # Pass 2: top up any shift below the minimum with random available staff.
    warnings = []
    for day in range(len(DAYS)):
        for shift in SHIFTS:
            while len(schedule[day][shift]) < MIN_PER_SHIFT:
                # candidates: under the 5-day cap and not already working today
                pool = [e for e in prefs
                        if days_worked[e] < MAX_DAYS and not works_on(e, day)]
                if not pool:  # impossible to staff -> report instead of crashing
                    warnings.append(f"{DAYS[day]} {shift}: only "
                                    f"{len(schedule[day][shift])} staff (no one available)")
                    break
                emp = rng.choice(pool)
                schedule[day][shift].append(emp)
                days_worked[emp] += 1
    return schedule, warnings


def print_schedule(schedule, warnings):
    # one row per day, one column per shift
    width = 34
    print("\n" + "=" * (12 + 3 * width))
    print("WEEKLY SCHEDULE".center(12 + 3 * width))
    print("=" * (12 + 3 * width))
    print(f"{'':12}" + "".join(s.capitalize().ljust(width) for s in SHIFTS))
    print("-" * (12 + 3 * width))
    for day, name in enumerate(DAYS):
        print(f"{name:12}" + "".join(", ".join(schedule[day][s]).ljust(width) for s in SHIFTS))
    print("=" * (12 + 3 * width))
    for w in warnings:
        print("WARNING:", w)


def ask_employee(name):
    # collect a ranked shift list for each day of the week
    print(f"\nPreferences for {name}")
    print("Enter shifts ranked best-first, e.g. 'morning evening afternoon' "
          "(first letter is enough, e.g. 'm e a').")
    print("Press Enter to reuse the previous day's answer.")
    prefs, last = {}, SHIFTS[:]
    for day, dname in enumerate(DAYS):
        while True:
            raw = input(f"  {dname}: ").strip().lower().split()
            if not raw:
                prefs[day] = last
                break
            ranked = []
            for token in raw:
                match = [s for s in SHIFTS if s.startswith(token)]
                if len(match) == 1 and match[0] not in ranked:
                    ranked.append(match[0])
            if ranked and len(ranked) == len(raw):
                prefs[day] = last = ranked
                break
            print("  Invalid input, try again.")
    return prefs


def interactive_input():
    # keep asking for employees until a blank name is entered
    prefs = {}
    while True:
        name = input("\nEmployee name (blank to finish): ").strip()
        if not name:
            if prefs:
                break
            continue
        if name in prefs:
            print("Name already entered.")
            continue
        prefs[name] = ask_employee(name)
    return prefs


def demo_input(rng):
    # sample data: 12 employees, each with a random shift ranking
    names = ["Alice", "Bob", "Carol", "Dave", "Erin", "Frank",
             "Grace", "Heidi", "Ivan", "Judy", "Mallory", "Niaj"]
    prefs = {}
    for n in names:
        favourite = rng.sample(SHIFTS, 3)
        prefs[n] = {d: favourite[:] for d in range(len(DAYS))}
    return prefs


if __name__ == "__main__":
    if "--demo" in sys.argv:
        rng = random.Random(632)  # fixed seed -> reproducible screenshot
        print_schedule(*build_schedule(demo_input(rng), rng))
    else:
        data = interactive_input()
        print_schedule(*build_schedule(data))
