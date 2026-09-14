/** Local-date helpers. Day keys are "YYYY-MM-DD" in the user's own timezone,
 *  so "today" means today where the learner is, not in UTC. */

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Day keys from `from` to `to` inclusive. */
export function dayKeyRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) out.push(dayKey(d));
  return out;
}
