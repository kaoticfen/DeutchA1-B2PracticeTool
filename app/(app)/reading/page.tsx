import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LEVELS, LEVEL_LABELS, type LevelName } from "@/lib/levels";

export default async function ReadingIndexPage() {
  const user = await requireUser();
  const texts = await prisma.readingText.findMany({ orderBy: [{ level: "asc" }, { id: "asc" }] });

  if (texts.length === 0) {
    return (
      <>
        <PageHeader title="Reading Mode" />
        <EmptyState
          title="No reading texts seeded yet"
          body="Run `npm run db:seed` to load the starter texts."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reading Mode"
        subtitle="Short German texts. Tap any word to hear it and see what it means."
      />

      <div className="space-y-8">
        {LEVELS.map((level) => {
          const group = texts.filter((t) => t.level === level);
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
                {group.map((t) => {
                  const words = t.bodyDe.split(/\s+/).length;
                  const glossary = Object.keys((t.glossary as object) ?? {}).length;

                  return (
                    <Link
                      key={t.id}
                      href={`/reading/${t.id}`}
                      className="surface p-4 transition-colors hover:border-[var(--color-brand-500)]"
                    >
                      <div className="font-medium">{t.title}</div>
                      <p className="muted mt-1.5 line-clamp-2 text-sm">
                        {t.bodyDe.slice(0, 120)}…
                      </p>
                      <div className="muted mt-3 text-xs">
                        {words} words · {glossary} glossed
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
