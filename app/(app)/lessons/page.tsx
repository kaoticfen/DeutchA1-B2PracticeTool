import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LEVELS, LEVEL_LABELS } from "@/lib/levels";
import type { LevelName } from "@/lib/levels";

export default async function LessonsPage() {
  const user = await requireUser();
  const lessons = await prisma.lesson.findMany({ orderBy: [{ level: "asc" }, { order: "asc" }] });

  if (lessons.length === 0) {
    return (
      <>
        <PageHeader title="Lessons" />
        <EmptyState
          title="No lessons seeded yet"
          body="Run `npm run db:seed` to load the starter lessons."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Lessons"
        subtitle="Structured grammar explanations, each with a direct link into practice."
      />

      <div className="space-y-8">
        {LEVELS.map((level) => {
          const group = lessons.filter((l) => l.level === level);
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
                {group.map((l) => (
                  <Link
                    key={l.id}
                    href={`/lessons/${l.slug}`}
                    className="surface p-4 transition-colors hover:border-[var(--color-brand-500)]"
                  >
                    <div className="muted text-xs uppercase tracking-wide">{l.topic}</div>
                    <div className="mt-1 font-medium">{l.title}</div>
                    <p className="muted mt-1.5 text-sm">{l.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
