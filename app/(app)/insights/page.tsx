import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { StatCard } from "@/components/StatCard";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { subcategoryLabel } from "@/lib/taxonomy";
import { addDays, dayKey } from "@/lib/dates";

const MISTAKE_LABELS: Record<string, string> = {
  VOCAB: "Vocabulary",
  EXERCISE: "Exercise",
  GAME: "Game",
  EXAM: "Exam",
};

export default async function InsightsPage() {
  const user = await requireUser();
  const since = dayKey(addDays(new Date(), -190));

  const [weakCards, mistakes, activity, lapseLeaders, topicStats] = await Promise.all([
    // Weak vocabulary: still unknown/shaky, ordered by how often they've lapsed.
    prisma.srsCard.findMany({
      where: { userId: user.id, state: { in: ["UNKNOWN", "SHAKY"] } },
      include: { word: { include: { noun: true } } },
      orderBy: [{ lapses: "desc" }, { reviewCount: "desc" }],
      take: 24,
    }),
    prisma.mistake.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.activityDay.findMany({
      where: { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.srsCard.count({ where: { userId: user.id, lapses: { gt: 0 } } }),
    // Which grammar topics are going worst.
    prisma.exerciseAttempt.findMany({
      where: { userId: user.id },
      include: { exercise: { select: { topic: true, tag: true, level: true } } },
      orderBy: { answeredAt: "desc" },
      take: 300,
    }),
  ]);

  const byTopic = new Map<string, { topic: string; tag: string; level: string; right: number; total: number }>();
  for (const a of topicStats) {
    const key = a.exercise.tag;
    const row =
      byTopic.get(key) ??
      { topic: a.exercise.topic, tag: key, level: a.exercise.level, right: 0, total: 0 };
    row.total += 1;
    if (a.correct) row.right += 1;
    byTopic.set(key, row);
  }

  const weakTopics = [...byTopic.values()]
    .filter((t) => t.total >= 3)
    .sort((a, b) => a.right / a.total - b.right / b.total)
    .slice(0, 6);

  const hasData = weakCards.length > 0 || mistakes.length > 0 || activity.length > 0;

  return (
    <>
      <PageHeader
        title="Insights"
        subtitle="Where you're losing points, and what to do about it."
      />

      {!hasData && (
        <div className="surface mb-6 p-6 text-center">
          <p className="muted text-sm">
            Nothing to analyse yet. Review some{" "}
            <Link href="/flashcards" className="underline">
              flashcards
            </Link>{" "}
            or try the{" "}
            <Link href="/daily" className="underline">
              daily challenge
            </Link>{" "}
            and come back.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Weak words" value={weakCards.length} hint="shaky or unknown" accent="var(--color-shaky-500)" />
        <StatCard label="Words that lapsed" value={lapseLeaders} hint="slipped back from Known" accent="var(--color-unknown-500)" />
        <StatCard label="Mistakes logged" value={mistakes.length} hint="most recent first" />
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="mb-4 font-medium">Activity</h2>
        <ActivityCalendar days={activity} />
      </section>

      {weakTopics.length > 0 && (
        <section className="surface mt-4 p-5">
          <h2 className="mb-4 font-medium">Weakest grammar topics</h2>
          <div className="space-y-3">
            {weakTopics.map((t) => {
              const pct = Math.round((t.right / t.total) * 100);
              return (
                <div key={t.tag}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Link href={`/exercises?level=${t.level}&tag=${t.tag}`} className="hover:underline">
                      {t.topic} <span className="muted text-xs">{t.level}</span>
                    </Link>
                    <span className="muted text-xs">
                      {t.right}/{t.total} · {pct}%
                    </span>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        background: pct < 50 ? "var(--color-unknown-500)" : pct < 80 ? "var(--color-shaky-500)" : "var(--color-known-500)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {weakCards.length > 0 && (
        <section className="surface mt-4 p-5">
          <h2 className="mb-1 font-medium">Weak vocabulary</h2>
          <p className="muted mb-4 text-sm">
            Words you keep forgetting, hardest first.{" "}
            <Link href="/flashcards" className="underline">
              Drill them
            </Link>
            .
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weakCards.map((c) => (
              <Link
                key={c.id}
                href={`/dictionary/${c.wordId}`}
                className="rounded-lg p-3 transition-colors hover:bg-[var(--surface-2)]"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {c.word.noun ? `${c.word.noun.article} ` : ""}
                    {c.word.lemma}
                  </span>
                  <span
                    className="shrink-0 text-xs"
                    style={{
                      color:
                        c.state === "UNKNOWN"
                          ? "var(--color-unknown-500)"
                          : "var(--color-shaky-500)",
                    }}
                  >
                    {c.state.toLowerCase()}
                  </span>
                </div>
                <div className="muted mt-0.5 text-sm">
                  {((c.word.translationsEn as string[]) ?? []).join(", ")}
                </div>
                <div className="muted mt-1.5 text-xs">
                  {subcategoryLabel(c.word.subcategory)} · {c.reviewCount} review
                  {c.reviewCount === 1 ? "" : "s"}
                  {c.lapses > 0 && ` · ${c.lapses} lapse${c.lapses === 1 ? "" : "s"}`}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {mistakes.length > 0 && (
        <section className="surface mt-4 p-5">
          <h2 className="mb-4 font-medium">Mistake log</h2>
          <div className="space-y-2">
            {mistakes.map((m) => (
              <div key={m.id} className="rounded-lg p-3 text-sm" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{m.prompt}</span>
                  <span className="muted shrink-0 text-xs">{MISTAKE_LABELS[m.kind] ?? m.kind}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span style={{ color: "var(--color-unknown-500)" }}>
                    you wrote: {m.given || "—"}
                  </span>
                  <span style={{ color: "var(--color-known-500)" }}>correct: {m.expected}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
