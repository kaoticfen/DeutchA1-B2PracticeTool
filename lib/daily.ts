import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { getExercisesByIds, pickExercises } from "@/lib/exercises";
import type { Level } from "@prisma/client";

export const DAILY_COUNT = 5;

/** Stable per-user, per-day seed so today's set never reshuffles on reload. */
function seedFor(userId: number, date: string): number {
  let h = 2166136261;
  for (const ch of `${userId}:${date}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns today's challenge, creating it on first visit of the day.
 * The chosen exercise ids are persisted, so the set is fixed once generated.
 */
export async function getOrCreateTodayChallenge(userId: number, level: Level) {
  const date = dayKey();

  const existing = await prisma.dailyChallenge.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing) {
    const ids = (existing.exerciseIds as number[]) ?? [];
    return { challenge: existing, exercises: await getExercisesByIds(ids) };
  }

  const picked = await pickExercises({
    level,
    count: DAILY_COUNT,
    seed: seedFor(userId, date),
  });

  // Fall back to any level if this one has too little content to fill a set.
  const exercises =
    picked.length >= DAILY_COUNT
      ? picked
      : await pickExercises({ count: DAILY_COUNT, seed: seedFor(userId, date) });

  const challenge = await prisma.dailyChallenge.create({
    data: {
      userId,
      date,
      exerciseIds: exercises.map((e) => e.id),
      answered: 0,
      score: 0,
      completed: exercises.length === 0,
    },
  });

  return { challenge, exercises };
}

export async function recentChallenges(userId: number, take = 14) {
  return prisma.dailyChallenge.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take,
  });
}
