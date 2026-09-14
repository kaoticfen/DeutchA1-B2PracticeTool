import { prisma } from "@/lib/db";
import { checkAnswer } from "@/lib/answers";
import { recordActivity, applyPromotionIfEarned } from "@/lib/stats";
import type { Level, ExerciseType, LevelMode } from "@prisma/client";
import type { LevelName } from "@/lib/levels";

export type ExerciseView = {
  id: number;
  level: Level;
  topic: string;
  tag: string;
  type: ExerciseType;
  prompt: string;
  options: string[] | null;
  explanation: string;
};

/** Strips the answer before sending an exercise to the client. */
function toView(e: {
  id: number;
  level: Level;
  topic: string;
  tag: string;
  type: ExerciseType;
  prompt: string;
  options: unknown;
  explanation: string;
}): ExerciseView {
  return {
    id: e.id,
    level: e.level,
    topic: e.topic,
    tag: e.tag,
    type: e.type,
    prompt: e.prompt,
    options: (e.options as string[] | null) ?? null,
    explanation: e.explanation,
  };
}

export async function pickExercises(opts: {
  level?: Level | null;
  tag?: string | null;
  type?: ExerciseType | null;
  count: number;
  seed?: number;
}): Promise<ExerciseView[]> {
  const rows = await prisma.exercise.findMany({
    where: {
      ...(opts.level ? { level: opts.level } : {}),
      ...(opts.tag ? { tag: opts.tag } : {}),
      ...(opts.type ? { type: opts.type } : {}),
    },
    orderBy: { id: "asc" },
  });

  return shuffle(rows, opts.seed).slice(0, opts.count).map(toView);
}

export async function getExercisesByIds(ids: number[]): Promise<ExerciseView[]> {
  const rows = await prisma.exercise.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  // Preserve the stored order so a daily challenge always looks the same.
  return ids.flatMap((id) => (byId.has(id) ? [toView(byId.get(id)!)] : []));
}

/**
 * Deterministic shuffle when a seed is supplied, so the daily challenge is
 * stable across reloads; otherwise random.
 */
export function shuffle<T>(items: T[], seed?: number): T[] {
  const out = [...items];
  let random: () => number;

  if (seed === undefined) {
    random = Math.random;
  } else {
    let s = seed >>> 0 || 1;
    random = () => {
      // xorshift32 — small, deterministic, good enough for ordering.
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type AttemptResult = {
  correct: boolean;
  answer: string;
  explanation: string;
  promotedTo?: string | null;
};

/**
 * Grades one exercise attempt server-side (the client never sees the answer
 * until it has committed to one) and records it.
 */
export async function submitAttempt(
  user: { id: number; currentLevel: string; levelMode: LevelMode },
  exerciseId: number,
  given: string,
  source: string,
): Promise<AttemptResult | null> {
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return null;

  const correct = checkAnswer(given, exercise.answer);

  await prisma.exerciseAttempt.create({
    data: { userId: user.id, exerciseId, correct, givenAnswer: given.slice(0, 255), source },
  });

  if (!correct) {
    await prisma.mistake.create({
      data: {
        userId: user.id,
        kind: "EXERCISE",
        refId: exerciseId,
        prompt: exercise.prompt,
        expected: exercise.answer,
        given: given.slice(0, 255),
      },
    });
  }

  await recordActivity(user.id, { exercises: 1, xp: correct ? 2 : 1 });

  const decision = await applyPromotionIfEarned(
    user.id,
    user.currentLevel as LevelName,
    user.levelMode,
  );

  return {
    correct,
    answer: exercise.answer,
    explanation: exercise.explanation,
    promotedTo: decision.promoted ? decision.to : null,
  };
}
