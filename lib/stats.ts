import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { computeStreak } from "@/lib/streak";
import { computeMastery, evaluatePromotion, type MasteryInput } from "@/lib/leveling";
import type { LevelName } from "@/lib/levels";
import type { Level, LevelMode } from "@prisma/client";

/** Raw counts feeding the mastery gates for one level. */
export async function masteryInputFor(userId: number, level: LevelName): Promise<MasteryInput> {
  const [totalWords, knownWords, attempts] = await Promise.all([
    prisma.word.count({ where: { level: level as Level } }),
    prisma.srsCard.count({
      where: { userId, state: "KNOWN", word: { level: level as Level } },
    }),
    prisma.exerciseAttempt.findMany({
      where: { userId, exercise: { level: level as Level } },
      select: { correct: true },
      orderBy: { answeredAt: "desc" },
      take: 200, // rolling window, so old mistakes stop dragging forever
    }),
  ]);

  return {
    totalWords,
    knownWords,
    totalAttempts: attempts.length,
    correctAttempts: attempts.filter((a) => a.correct).length,
  };
}

export async function levelProgress(userId: number, level: LevelName) {
  return computeMastery(await masteryInputFor(userId, level));
}

/**
 * Recompute the user's level and persist a promotion if they've earned one.
 * Safe to call after any scored activity; a no-op in MANUAL mode.
 */
export async function applyPromotionIfEarned(
  userId: number,
  level: LevelName,
  mode: LevelMode,
) {
  const decision = evaluatePromotion(level, mode, await masteryInputFor(userId, level));
  if (decision.promoted) {
    await prisma.user.update({
      where: { id: userId },
      data: { currentLevel: decision.to as Level },
    });
  }
  return decision;
}

export async function vocabBreakdown(userId: number) {
  const rows = await prisma.srsCard.groupBy({
    by: ["state"],
    where: { userId },
    _count: { _all: true },
  });

  const get = (s: string) => rows.find((r) => r.state === s)?._count._all ?? 0;
  const known = get("KNOWN");
  const shaky = get("SHAKY");
  const unknown = get("UNKNOWN");
  const totalWords = await prisma.word.count();

  return { known, shaky, unknown, seen: known + shaky + unknown, totalWords };
}

export async function dueCount(userId: number) {
  return prisma.srsCard.count({ where: { userId, dueAt: { lte: new Date() } } });
}

export async function streakFor(userId: number) {
  const rows = await prisma.dailyChallenge.findMany({
    where: { userId, completed: true },
    select: { date: true },
  });
  return computeStreak(rows.map((r) => r.date));
}

export async function todayChallenge(userId: number) {
  return prisma.dailyChallenge.findUnique({
    where: { userId_date: { userId, date: dayKey() } },
  });
}

/** Bump today's activity counters. Creates the row on first activity of the day. */
export async function recordActivity(
  userId: number,
  delta: { reviews?: number; exercises?: number; games?: number; xp?: number },
) {
  const date = dayKey();
  const inc = {
    reviews: delta.reviews ?? 0,
    exercises: delta.exercises ?? 0,
    games: delta.games ?? 0,
    xp: delta.xp ?? 0,
  };

  await prisma.activityDay.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...inc },
    update: {
      reviews: { increment: inc.reviews },
      exercises: { increment: inc.exercises },
      games: { increment: inc.games },
      xp: { increment: inc.xp },
    },
  });
}

export async function contentCounts() {
  const [words, exercises, lessons, readings, examItems] = await Promise.all([
    prisma.word.count(),
    prisma.exercise.count(),
    prisma.lesson.count(),
    prisma.readingText.count(),
    prisma.examItem.count(),
  ]);
  return { words, exercises, lessons, readings, examItems };
}
