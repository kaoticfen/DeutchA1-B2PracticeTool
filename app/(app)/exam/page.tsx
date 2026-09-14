import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EXAM_SECTIONS } from "@/lib/exam";

export default async function ExamIndexPage() {
  const user = await requireUser();

  const [counts, attempts] = await Promise.all([
    prisma.examItem.groupBy({ by: ["section"], _count: { _all: true } }),
    prisma.examAttempt.groupBy({
      by: ["section"],
      where: { userId: user.id },
      _count: { _all: true },
      _sum: { score: true, total: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Exam Prep"
        subtitle={`Practice in the five exam formats, at ${user.currentLevel} and every other level.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {EXAM_SECTIONS.map((s) => {
          const count = counts.find((c) => c.section === s.key)?._count._all ?? 0;
          const att = attempts.find((a) => a.section === s.key);

          return (
            <Link
              key={s.key}
              href={`/exam/${s.slug}`}
              className="surface p-5 transition-colors hover:border-[var(--color-brand-500)]"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{s.label}</div>
                  <p className="muted mt-1 text-sm">{s.blurb}</p>
                  <div className="muted mt-3 text-xs">
                    {count} task{count === 1 ? "" : "s"}
                    {att ? ` · ${att._sum.score}/${att._sum.total} across ${att._count._all} attempt(s)` : " · not attempted"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
