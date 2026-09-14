import { addDays, dayKey } from "@/lib/dates";

type Day = { date: string; reviews: number; exercises: number; games: number; xp: number };

/** A GitHub-style contribution grid over the last 26 weeks. */
export function ActivityCalendar({ days }: { days: Day[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weeks = 26;

  const today = new Date();
  // Start on the Monday of the week containing the first displayed day.
  const start = addDays(today, -(weeks * 7 - 1));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const maxXp = Math.max(1, ...days.map((d) => d.xp));

  const columns: string[][] = [];
  for (let w = 0; w < weeks + 1; w++) {
    const col: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > today) break;
      col.push(dayKey(date));
    }
    if (col.length) columns.push(col);
  }

  const shade = (xp: number) => {
    if (xp === 0) return "var(--surface-2)";
    const intensity = 0.2 + 0.8 * Math.min(1, xp / maxXp);
    return `color-mix(in srgb, var(--color-known-500) ${Math.round(intensity * 100)}%, transparent)`;
  };

  const totalXp = days.reduce((n, d) => n + d.xp, 0);
  const activeDays = days.filter((d) => d.xp > 0).length;

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map((date) => {
                const d = byDate.get(date);
                const xp = d?.xp ?? 0;
                return (
                  <div
                    key={date}
                    className="h-3 w-3 rounded-sm"
                    style={{
                      background: shade(xp),
                      outline: date === dayKey() ? "1.5px solid var(--color-brand-500)" : "none",
                    }}
                    title={
                      d
                        ? `${date} · ${d.reviews} reviews, ${d.exercises} exercises, ${d.games} games`
                        : `${date} · nothing`
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="muted mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span>
          {activeDays} active day{activeDays === 1 ? "" : "s"} · {totalXp} XP in the last 6 months
        </span>
        <span className="flex items-center gap-1.5">
          less
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <span key={f} className="h-3 w-3 rounded-sm" style={{ background: shade(f * maxXp) }} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}
