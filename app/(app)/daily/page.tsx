import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ExerciseRunner } from "@/components/ExerciseRunner";
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
      ) : challenge.completed ? (
        <div className="surface p-8 text-center">
          <div className="text-3xl" aria-hidden>
            ★
          </div>
          <h2 className="mt-3 text-xl font-semibold">Today&apos;s challenge is done</h2>
          <p className="muted mt-1 text-sm">
            You scored {challenge.score} out of {exercises.length}. Come back tomorrow to extend
            your streak.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/exercises" className="btn btn-primary">
              Keep practising
            </Link>
            <Link href="/flashcards" className="btn btn-ghost">
              Review flashcards
            </Link>
          </div>
        </div>
      ) : (
        <ExerciseRunner
          key={`${challenge.id}-${answered}`}
          exercises={remaining}
          source="daily"
          onFinishHref="/daily"
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
