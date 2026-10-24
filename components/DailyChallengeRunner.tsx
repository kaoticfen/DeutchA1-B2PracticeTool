"use client";

import Link from "next/link";
import { useState } from "react";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import type { ExerciseView } from "@/lib/exercises";

export function DailyChallengeRunner({
  completed,
  score,
  total,
  remaining,
}: {
  completed: boolean;
  score: number;
  total: number;
  remaining: ExerciseView[];
}) {
  // Each answer revalidates /daily, and the last one flips `completed` to true.
  // Latch the value from mount so a run in progress keeps its runner (and the
  // feedback for the final question) instead of being swapped for the done card.
  const [doneAtMount] = useState(completed);

  if (!doneAtMount) {
    return <ExerciseRunner exercises={remaining} source="daily" onFinishHref="/daily" />;
  }

  return (
    <div className="surface p-8 text-center">
      <div className="text-3xl" aria-hidden>
        ★
      </div>
      <h2 className="mt-3 text-xl font-semibold">Today&apos;s challenge is done</h2>
      <p className="muted mt-1 text-sm">
        You scored {score} out of {total}. Come back tomorrow to extend your streak.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/exercises" className="btn btn-primary">
          Keep practising
        </Link>
        <Link href="/flashcards" className="btn btn-ghost">
          Review flashcards
        </Link>
      </div>
    </div>
  );
}
