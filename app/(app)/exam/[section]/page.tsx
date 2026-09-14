import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LEVELS, LEVEL_LABELS, type LevelName } from "@/lib/levels";
import { EXAM_SECTIONS } from "@/lib/exam";
import type { ExamSection } from "@prisma/client";

export default async function ExamSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const user = await requireUser();
  const { section: slug } = await params;

  const section = EXAM_SECTIONS.find((s) => s.slug === slug);
  if (!section) notFound();

  const [items, attempts] = await Promise.all([
    prisma.examItem.findMany({
      where: { section: section.key as ExamSection },
      orderBy: [{ level: "asc" }, { id: "asc" }],
    }),
    prisma.examAttempt.groupBy({
      by: ["examItemId"],
      where: { userId: user.id, section: section.key as ExamSection },
      _count: { _all: true },
      _max: { score: true, total: true },
    }),
  ]);

  return (
    <>
      <nav className="muted mb-4 text-sm">
        <Link href="/exam" className="underline">
          Exam Prep
        </Link>{" "}
        / {section.label}
      </nav>

      <PageHeader title={`${section.label} tasks`} subtitle={section.blurb} />

      {items.length === 0 ? (
        <EmptyState
          title={`No ${section.label.toLowerCase()} tasks seeded`}
          body="Run `npm run db:seed` to load the starter exam bank."
          cta={{ href: "/exam", label: "Back to Exam Prep" }}
        />
      ) : (
        <div className="space-y-8">
          {LEVELS.map((level) => {
            const group = items.filter((i) => i.level === level);
            if (group.length === 0) return null;

            return (
              <section key={level}>
                <h2 className="mb-3 flex items-center gap-2 font-medium">
                  {LEVEL_LABELS[level as LevelName]}
                  {user.currentLevel === level && (
                    <span className="pill text-xs" data-active="true">
                      your level
                    </span>
                  )}
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {group.map((item) => {
                    const att = attempts.find((a) => a.examItemId === item.id);
                    return (
                      <Link
                        key={item.id}
                        href={`/exam/item/${item.id}`}
                        className="surface p-4 transition-colors hover:border-[var(--color-brand-500)]"
                      >
                        <div className="font-medium">{item.title}</div>
                        <div className="muted mt-2 text-xs">
                          {att
                            ? `Best ${att._max.score}/${att._max.total} · ${att._count._all} attempt(s)`
                            : "Not attempted"}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
