import { prisma } from "@/lib/db";
import { gradeCard, type MasteryStateName } from "@/lib/srs";
import { applyPromotionIfEarned, recordActivity } from "@/lib/stats";
import type { LevelName } from "@/lib/levels";
import type { LevelMode } from "@prisma/client";

/**
 * Persists one flashcard grading: updates the card, logs the review, bumps
 * today's activity, and re-evaluates level promotion.
 *
 * Kept separate from the server action so it can be exercised directly.
 */
export async function applyGrade(
  user: { id: number; currentLevel: string; levelMode: LevelMode },
  wordId: number,
  state: MasteryStateName,
  now: Date = new Date(),
) {
  const existing = await prisma.srsCard.findUnique({
    where: { userId_wordId: { userId: user.id, wordId } },
  });

  const result = gradeCard((existing?.state as MasteryStateName) ?? null, state, now);

  await prisma.$transaction([
    prisma.srsCard.upsert({
      where: { userId_wordId: { userId: user.id, wordId } },
      create: {
        userId: user.id,
        wordId,
        state: result.state,
        dueAt: result.dueAt,
        lastReviewedAt: result.lastReviewedAt,
        reviewCount: 1,
        lapses: result.lapseDelta,
      },
      update: {
        state: result.state,
        dueAt: result.dueAt,
        lastReviewedAt: result.lastReviewedAt,
        reviewCount: { increment: result.reviewCountDelta },
        lapses: { increment: result.lapseDelta },
      },
    }),
    prisma.reviewLog.create({
      data: {
        userId: user.id,
        wordId,
        fromState: existing?.state ?? null,
        toState: result.state,
      },
    }),
  ]);

  await recordActivity(user.id, { reviews: 1, xp: state === "KNOWN" ? 3 : 1 });

  const decision = await applyPromotionIfEarned(
    user.id,
    user.currentLevel as LevelName,
    user.levelMode,
  );

  return { dueAt: result.dueAt, promotedTo: decision.promoted ? decision.to : null };
}
