"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { recordGame, type GameKey } from "@/lib/games";
import { recordActivity } from "@/lib/stats";
import { prisma } from "@/lib/db";

const schema = z.object({
  game: z.enum(["WORD_MATCH", "GENDER_BATTLE", "LISTENING_QUIZ", "FILL_BLANK"]),
  score: z.number().int().min(0),
  total: z.number().int().min(0),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000),
  mistakes: z
    .array(z.object({ prompt: z.string().max(500), expected: z.string().max(255), given: z.string().max(255) }))
    .max(50)
    .optional(),
});

export async function finishGame(input: {
  game: GameKey;
  score: number;
  total: number;
  durationMs: number;
  mistakes?: { prompt: string; expected: string; given: string }[];
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid game result." };

  const user = await requireUser();
  const { game, score, total, durationMs, mistakes } = parsed.data;

  await recordGame(user.id, game, score, total, durationMs);
  await recordActivity(user.id, { games: 1, xp: score });

  if (mistakes?.length) {
    await prisma.mistake.createMany({
      data: mistakes.map((m) => ({
        userId: user.id,
        kind: "GAME" as const,
        prompt: m.prompt,
        expected: m.expected,
        given: m.given,
      })),
    });
  }

  revalidatePath("/games");
  revalidatePath("/progress");
  revalidatePath("/insights");
  return { ok: true };
}
