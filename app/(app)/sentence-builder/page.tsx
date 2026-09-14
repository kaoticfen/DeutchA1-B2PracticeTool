import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LevelFilter } from "@/components/LevelFilter";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { pickExercises } from "@/lib/exercises";
import { isLevel } from "@/lib/levels";
import type { Level } from "@prisma/client";

export default async function SentenceBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const level = (isLevel(sp.level) ? sp.level : user.currentLevel) as Level;

  const exercises = await pickExercises({ level, type: "SENTENCE_BUILD", count: 8 });

  return (
    <>
      <PageHeader
        title="Sentence Builder"
        subtitle="Tap the word tiles in the right order. German word order is the whole point — verb second, everything else follows."
      />

      <div className="mb-5">
        <Suspense fallback={null}>
          <LevelFilter basePath="/sentence-builder" />
        </Suspense>
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="No sentence puzzles at this level yet"
          body="Try another level, or seed more content with `npm run db:seed`."
          cta={{ href: "/sentence-builder", label: "Reset" }}
        />
      ) : (
        <ExerciseRunner
          key={level}
          exercises={exercises}
          source="exercises"
          onFinishHref="/dashboard"
        />
      )}
    </>
  );
}
