import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MasteryBar } from "@/components/MasteryBar";
import { StatCard } from "@/components/StatCard";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { masteryInputFor, streakFor, vocabBreakdown } from "@/lib/stats";
import { LEVELS, type LevelName } from "@/lib/levels";
import { TAXONOMY } from "@/lib/taxonomy";

export default async function ProgressPage() {
  const user = await requireUser();

  const [vocab, streak, perLevel, bySubcategory, exerciseStats, gameStats, examStats] =
    await Promise.all([
      vocabBreakdown(user.id),
      streakFor(user.id),
      Promise.all(
        LEVELS.map(async (level) => ({ level, ...(await masteryInputFor(user.id, level)) })),
      ),
      prisma.srsCard.groupBy({
        by: ["state"],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      prisma.exerciseAttempt.groupBy({
        by: ["correct"],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      prisma.gameSession.aggregate({
        where: { userId: user.id },
        _sum: { score: true, total: true },
        _count: { _all: true },
      }),
      prisma.examAttempt.groupBy({
        by: ["section"],
        where: { userId: user.id },
        _sum: { score: true, total: true },
        _count: { _all: true },
      }),
    ]);

  const correct = exerciseStats.find((s) => s.correct)?._count._all ?? 0;
  const wrong = exerciseStats.find((s) => !s.correct)?._count._all ?? 0;
  const totalAttempts = correct + wrong;
  const accuracy = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;

  // Per-subcategory mastery, so weak areas are visible at a glance.
  const subcatRows = await Promise.all(
    TAXONOMY.flatMap((c) => c.subcategories).map(async (sub) => {
      const [total, known] = await Promise.all([
        prisma.word.count({ where: { subcategory: sub.id } }),
        prisma.srsCard.count({
          where: { userId: user.id, state: "KNOWN", word: { subcategory: sub.id } },
        }),
      ]);
      return { id: sub.id, label: sub.label, total, known };
    }),
  );

  return (
    <>
      <PageHeader title="Progress" subtitle="Scores and vocabulary mastery across every section." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Words known" value={vocab.known} hint={`of ${vocab.totalWords} total`} accent="var(--color-known-500)" />
        <StatCard label="Exercise accuracy" value={`${accuracy}%`} hint={`${correct}/${totalAttempts} correct`} />
        <StatCard label="Games played" value={gameStats._count._all} hint={`${gameStats._sum.score ?? 0} points scored`} />
        <StatCard label="Current streak" value={streak.current} hint={`longest ${streak.longest}`} accent="var(--color-brand-500)" />
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="mb-4 font-medium">Vocabulary mastery</h2>
        <MasteryBar
          known={bySubcategory.find((r) => r.state === "KNOWN")?._count._all ?? 0}
          shaky={bySubcategory.find((r) => r.state === "SHAKY")?._count._all ?? 0}
          unknown={bySubcategory.find((r) => r.state === "UNKNOWN")?._count._all ?? 0}
          total={vocab.totalWords}
        />
      </section>

      <section className="surface mt-4 p-5">
        <h2 className="mb-4 font-medium">By level</h2>
        <div className="space-y-4">
          {perLevel.map((l) => {
            const vocabPct = l.totalWords > 0 ? (l.knownWords / l.totalWords) * 100 : 0;
            const accPct = l.totalAttempts > 0 ? (l.correctAttempts / l.totalAttempts) * 100 : 0;
            return (
              <div key={l.level}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {l.level}
                    {(user.currentLevel as LevelName) === l.level && (
                      <span className="muted ml-2 text-xs">current</span>
                    )}
                  </span>
                  <span className="muted text-xs">
                    {l.knownWords}/{l.totalWords} words · {Math.round(accPct)}% accuracy (
                    {l.totalAttempts} attempts)
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div style={{ width: `${vocabPct}%`, background: "var(--color-known-500)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface mt-4 p-5">
        <h2 className="mb-4 font-medium">By category</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {subcatRows
            .filter((r) => r.total > 0)
            .map((r) => (
              <div key={r.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{r.label}</span>
                  <span className="muted">
                    {r.known}/{r.total}
                  </span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div
                    style={{
                      width: `${(r.known / r.total) * 100}%`,
                      background: "var(--color-known-500)",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="surface mt-4 p-5">
        <h2 className="mb-4 font-medium">Exam sections</h2>
        {examStats.length === 0 ? (
          <p className="muted text-sm">
            No exam attempts yet.{" "}
            <Link href="/exam" className="underline">
              Try an exam section
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {examStats.map((s) => (
              <div key={s.section} className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                <div className="text-xs uppercase tracking-wide muted">{s.section}</div>
                <div className="mt-1 text-lg font-semibold">
                  {s._sum.score ?? 0}/{s._sum.total ?? 0}
                </div>
                <div className="muted text-xs">{s._count._all} attempt(s)</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
