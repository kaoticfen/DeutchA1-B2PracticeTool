import { PageHeader } from "@/components/PageHeader";
import { DailyChallengeRunner } from "@/components/DailyChallengeRunner";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { requireUser } from "@/lib/session";
import { getOrCreateTodayChallenge, recentChallenges, DAILY_COUNT } from "@/lib/daily";
import { streakFor } from "@/lib/stats";
import { dayKey } from "@/lib/dates";
import type { Level } from "@prisma/client";

export default async function DailyPage() {
  const user = await requireUser();

  const { challenge, exercises } = await getOrCreateTodayChallenge(
    user.id,
    user.currentLevel as Level,
  );
  const [streak, recent] = await Promise.all([streakFor(user.id), recentChallenges(user.id)]);

  const answered = challenge.answered;
  const remaining = exercises.slice(answered);

  return (
    <>
      <PageHeader
        title="Daily Challenge"
        subtitle={`${DAILY_COUNT} questions a day. Keep the streak alive.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current streak"
          value={streak.current}
          hint={`day${streak.current === 1 ? "" : "s"} in a row`}
          accent="var(--color-brand-500)"
        />
        <StatCard label="Longest streak" value={streak.longest} hint="personal best" />
        <StatCard
          label="Today"
          value={challenge.completed ? "Complete" : `${answered}/${exercises.length}`}
          hint={challenge.completed ? `Scored ${challenge.score}/${exercises.length}` : "In progress"}
        />
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="No exercises available"
          body="The daily challenge needs seeded grammar exercises. Run `npm run db:seed` first."
        />
      ) : (
        <DailyChallengeRunner
          key={challenge.id}
          completed={challenge.completed}
          score={challenge.score}
          total={exercises.length}
          remaining={remaining}
        />
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Last two weeks</h2>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            const key = dayKey(d);
            const entry = recent.find((r) => r.date === key);
            const isToday = key === dayKey();

            return (
              <div
                key={key}
                title={`${key}${entry ? ` · ${entry.score}/${DAILY_COUNT}` : " · not done"}`}
                className="h-8 w-8 rounded"
                style={{
                  background: entry?.completed
                    ? "var(--color-known-500)"
                    : entry
                      ? "var(--color-shaky-500)"
                      : "var(--surface-2)",
                  outline: isToday ? "2px solid var(--color-brand-500)" : "none",
                  outlineOffset: "1px",
                }}
              />
            );
          })}
        </div>
        <p className="muted mt-2 text-xs">
          Green = completed · amber = started · today is outlined.
        </p>
      </section>
    </>
  );
}
