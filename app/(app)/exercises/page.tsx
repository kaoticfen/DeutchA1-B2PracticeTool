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

type TopicRow = { tag: string; topic: string; _count: { _all: number } };
type TopicFilter = { tag: string; label: string; count: number };

/**
 * One entry per tag, counting every exercise under it.
 *
 * A topic only doubles as a label while it names exactly one tag: "a1-satzbau"
 * spans three topics, and "Syntax" covers both a1-wortstellung and a1-negation.
 * Either way the tag itself is the honest label ("a1-satzbau" -> "Satzbau").
 */
function foldTopicsByTag(rows: TopicRow[]): TopicFilter[] {
  const byTag = new Map<string, { tag: string; topics: Set<string>; count: number }>();
  for (const row of rows) {
    const entry = byTag.get(row.tag) ?? { tag: row.tag, topics: new Set<string>(), count: 0 };
    entry.count += row._count._all;
    entry.topics.add(row.topic);
    byTag.set(row.tag, entry);
  }

  const tagsPerTopic = new Map<string, number>();
  for (const { topics } of byTag.values()) {
    for (const topic of topics) tagsPerTopic.set(topic, (tagsPerTopic.get(topic) ?? 0) + 1);
  }

  return [...byTag.values()].map(({ tag, topics, count }) => {
    const [topic] = topics;
    const unambiguous = topics.size === 1 && tagsPerTopic.get(topic) === 1;
    return { tag, label: unambiguous ? topic : tagLabel(tag), count };
  });
}

/** "a1-satzbau" -> "Satzbau". */
function tagLabel(tag: string): string {
  const name = tag.replace(/^[ab][12]-/, "").replace(/-/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

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

  const [exercises, topicRows] = await Promise.all([
    pickExercises({ level, tag, type, count: SET_SIZE }),
    prisma.exercise.groupBy({
      by: ["tag", "topic"],
      where: { level },
      _count: { _all: true },
      orderBy: [{ tag: "asc" }, { topic: "asc" }],
    }),
  ]);

  // A tag can span several topics (a1-satzbau drills verbs, nouns AND
  // prepositions), so the grouped rows are folded back down to one pill per
  // tag — the tag is what the filter actually selects on.
  const topics = foldTopicsByTag(topicRows);

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
          tag ? ` · ${topics.find((t) => t.tag === tag)?.label ?? tag}` : ""
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
              {t.label} <span className="muted">{t.count}</span>
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
