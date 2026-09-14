import { addDays, dayKey } from "./dates";

/**
 * Streak over a set of completed day keys.
 *
 * The current streak counts back from today, but a day that is merely still in
 * progress must not break it — so if today is not yet done we start counting
 * from yesterday.
 */
export function computeStreak(
  completedDays: Iterable<string>,
  today: Date = new Date(),
): { current: number; longest: number } {
  const days = new Set(completedDays);
  if (days.size === 0) return { current: 0, longest: 0 };

  const todayKey = dayKey(today);
  let cursor = days.has(todayKey) ? new Date(today) : addDays(today, -1);

  let current = 0;
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    run = prev !== null && dayKey(addDays(new Date(`${prev}T00:00:00`), 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  }

  return { current, longest };
}
