import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Markdown } from "@/components/Markdown";
import { SpeakButton } from "@/components/SpeakButton";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LEVEL_LABELS, type LevelName } from "@/lib/levels";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;

  const lesson = await prisma.lesson.findUnique({ where: { slug } });
  if (!lesson) notFound();

  const keyRules = (lesson.keyRules as string[]) ?? [];
  const examples = (lesson.examples as { de: string; en: string }[]) ?? [];

  const exerciseCount = await prisma.exercise.count({ where: { tag: lesson.exerciseTag } });
  const practiceHref = `/exercises?level=${lesson.level}&tag=${lesson.exerciseTag}`;

  return (
    <>
      <nav className="muted mb-4 text-sm">
        <Link href="/lessons" className="underline">
          Lessons
        </Link>{" "}
        / {lesson.topic}
      </nav>

      <PageHeader
        title={lesson.title}
        subtitle={`${LEVEL_LABELS[lesson.level as LevelName]} · ${lesson.topic}`}
        action={
          exerciseCount > 0 ? (
            <Link href={practiceHref} className="btn btn-primary">
              Practise this ({exerciseCount})
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="surface p-5 sm:p-7">
          <Markdown>{lesson.bodyMd}</Markdown>
        </article>

        <aside className="space-y-4">
          <section className="surface p-5">
            <h2 className="mb-3 text-sm font-medium">Key rules</h2>
            <ul className="space-y-2 text-sm">
              {keyRules.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "var(--color-brand-500)" }}>▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface p-5">
            <h2 className="mb-3 text-sm font-medium">Examples</h2>
            <ul className="space-y-3 text-sm">
              {examples.map((e, i) => (
                <li key={i}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{e.de}</span>
                    <SpeakButton text={e.de} label="" className="btn btn-ghost px-2 py-1 text-xs" />
                  </div>
                  <div className="muted mt-0.5">{e.en}</div>
                </li>
              ))}
            </ul>
          </section>

          {exerciseCount > 0 && (
            <Link href={practiceHref} className="btn btn-primary w-full">
              Practise this lesson
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
