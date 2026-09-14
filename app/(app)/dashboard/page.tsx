import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProgressRing } from "@/components/ProgressRing";
import { MasteryBar } from "@/components/MasteryBar";
import { requireUser } from "@/lib/session";
import { contentCounts, dueCount, levelProgress, streakFor, todayChallenge, vocabBreakdown } from "@/lib/stats";
import { LEVEL_LABELS, nextLevel, type LevelName } from "@/lib/levels";
import { NAV_ITEMS } from "@/lib/nav";

export default async function DashboardPage() {
  const user = await requireUser();
  const level = user.currentLevel as LevelName;

  const [progress, vocab, due, streak, today, counts] = await Promise.all([
    levelProgress(user.id, level),
    vocabBreakdown(user.id),
    dueCount(user.id),
    streakFor(user.id),
    todayChallenge(user.id),
    contentCounts(),
  ]);

  const up = nextLevel(level);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hallo, ${firstName}`}
        subtitle={`You're working at ${LEVEL_LABELS[level]}. Goal: B2.`}
      />

      {counts.words === 0 && (
        <div
          className="surface mb-6 p-4 text-sm"
          style={{ borderColor: "var(--color-shaky-500)" }}
        >
          <strong>No vocabulary seeded yet.</strong>{" "}
          <span className="muted">
            Run <code>npm run db:seed</code> to load the starter set, or{" "}
            <code>npm run generate:seed</code> with an <code>ANTHROPIC_API_KEY</code> to build the
            full A1–B2 corpus.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Due for review"
          value={due}
          hint={due === 0 ? "All caught up" : "Cards ready now"}
          href="/flashcards"
        />
        <StatCard
          label="Daily streak"
          value={streak.current}
          hint={`Longest: ${streak.longest} day${streak.longest === 1 ? "" : "s"}`}
          href="/daily"
          accent="var(--color-brand-500)"
        />
        <StatCard
          label="Words known"
          value={vocab.known}
          hint={`of ${vocab.totalWords} in the dictionary`}
          href="/progress"
          accent="var(--color-known-500)"
        />
        <StatCard
          label="Today's challenge"
          value={today?.completed ? "Done" : `${today?.answered ?? 0}/5`}
          hint={today?.completed ? "Come back tomorrow" : "5 quick questions"}
          href="/daily"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-4 font-medium">Progress toward {up ?? "mastery"}</h2>
          <ProgressRing
            value={progress.overall}
            label={up ? `${level} → ${up}` : "B2 reached"}
            sublabel={
              up
                ? `${Math.round(progress.vocabRatio * 100)}% vocab · ${Math.round(
                    progress.accuracyRatio * 100,
                  )}% accuracy · ${progress.attempts} attempts`
                : "You've hit the goal level."
            }
          />
          <ul className="muted mt-4 space-y-1.5 text-xs">
            <li>{progress.vocabMet ? "✓" : "○"} 80% of {level} vocabulary marked Known</li>
            <li>{progress.accuracyMet ? "✓" : "○"} 80% accuracy on {level} exercises</li>
            <li>{progress.attemptsMet ? "✓" : "○"} At least 20 exercise attempts</li>
          </ul>
          {user.levelMode === "MANUAL" && (
            <p className="muted mt-3 text-xs">
              Automatic promotion is off — your level is set manually in{" "}
              <Link href="/profile" className="underline">
                settings
              </Link>
              .
            </p>
          )}
        </section>

        <section className="surface p-5">
          <h2 className="mb-4 font-medium">Vocabulary mastery</h2>
          <MasteryBar
            known={vocab.known}
            shaky={vocab.shaky}
            unknown={vocab.unknown}
            total={vocab.totalWords}
          />
          <div className="muted mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div>{counts.words} words</div>
            <div>{counts.exercises} exercises</div>
            <div>{counts.lessons} lessons</div>
            <div>{counts.readings} reading texts</div>
            <div>{counts.examItems} exam items</div>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-medium">Jump in</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_ITEMS.filter((i) => i.href !== "/dashboard").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="surface flex items-center gap-3 p-3.5 text-sm transition-colors hover:border-[var(--color-brand-500)]"
            >
              <span aria-hidden className="text-lg">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
