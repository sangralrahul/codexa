/** Habit data, date helpers and the sample habits a new install starts with. */
export type Habit = { id: string; name: string; icon: HabitIcon; goal: string; done: string[] };

export type HabitIcon = "water" | "walk" | "book" | "leaf" | "barbell" | "moon" | "bicycle" | "musical-notes";
export const ICONS: HabitIcon[] = ["water", "walk", "book", "leaf", "barbell", "moon", "bicycle", "musical-notes"];

/** YYYY-MM-DD in local time. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** The last seven days, oldest first, ending today. */
export function lastSevenDays(today = new Date()): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
}

/** Consecutive days completed, counting back from today (or yesterday if today is still open). */
export function streak(habit: Habit, today = new Date()): number {
  const done = new Set(habit.done);
  let cursor = done.has(dayKey(today)) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(dayKey(cursor))) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

function seed(offsets: number[]): string[] {
  const today = new Date();
  return offsets.map((o) => dayKey(addDays(today, -o)));
}

export function sampleHabits(): Habit[] {
  return [
    { id: "h1", name: "Drink 2 litres of water", icon: "water", goal: "Every day", done: seed([1, 2, 3, 4, 5, 6]) },
    { id: "h2", name: "10-minute walk", icon: "walk", goal: "Every day", done: seed([0, 1, 2, 4, 5]) },
    { id: "h3", name: "Read 20 pages", icon: "book", goal: "Every day", done: seed([0, 2, 3, 6]) },
    { id: "h4", name: "Lights out by 11", icon: "moon", goal: "Weeknights", done: seed([1, 3]) },
  ];
}
