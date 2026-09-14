import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LevelFilter } from "@/components/LevelFilter";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { pickExercises } from "@/lib/exercises";
import { prisma } from "@/lib/db";
import { isLevel, type LevelName } from "@/lib/levels";
import type { Level, ExerciseType } from "@prisma/client";
import Link from "next/link";

const SET_SIZE = 10;

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  FILL_BLANK: "Fill in the blank",
  SENTENCE_BUILD: "Sentence building",
};

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; tag?: string; type?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Default to the learner's own level rather than dumping every exercise.
  const level = isLevel(sp.level) ? (sp.level as Level) : (user.currentLevel as Level);
  const tag = sp.tag ?? null;
  const type = sp.type && sp.type in TYPE_LABELS ? (sp.type as ExerciseType) : null;

  const [exercises, topics] = await Promise.all([
    pickExercises({ level, tag, type, count: SET_SIZE }),
    prisma.exercise.groupBy({
      by: ["tag", "topic"],
      where: { level },
      _count: { _all: true },
      orderBy: { tag: "asc" },
    }),
  ]);

  const qs = (next: Record<string, string | null>) => {
    const q = new URLSearchParams();
    q.set("level", level);
    if (tag) q.set("tag", tag);
    if (type) q.set("type", type);
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `/exercises?${q.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Grammar Exercises"
        subtitle={`${TYPE_LABELS[type ?? ""] ?? "Mixed"} drills at ${level}${
          tag ? ` · ${topics.find((t) => t.tag === tag)?.topic ?? tag}` : ""
        }.`}
      />

      <div className="mb-5 space-y-3">
        <Suspense fallback={null}>
          <LevelFilter basePath="/exercises" />
        </Suspense>

        <div className="flex flex-wrap gap-2">
          <Link href={qs({ type: null })} className="pill" data-active={!type}>
            All types
          </Link>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <Link key={value} href={qs({ type: value })} className="pill" data-active={type === value}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={qs({ tag: null })} className="pill" data-active={!tag}>
            All topics
          </Link>
          {topics.map((t) => (
            <Link key={t.tag} href={qs({ tag: t.tag })} className="pill" data-active={tag === t.tag}>
              {t.topic} <span className="muted">{t._count._all}</span>
            </Link>
          ))}
        </div>
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="No exercises for this combination"
          body="Try a different level, topic or exercise type — or seed more content."
          cta={{ href: "/exercises", label: "Reset filters" }}
        />
      ) : (
        <ExerciseRunner
          key={`${level}-${tag}-${type}`}
          exercises={exercises}
          source="exercises"
          onFinishHref="/dashboard"
        />
      )}
    </>
  );
}
