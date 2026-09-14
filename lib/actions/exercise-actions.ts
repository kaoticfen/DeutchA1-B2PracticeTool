"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { submitAttempt, type AttemptResult } from "@/lib/exercises";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";

const schema = z.object({
  exerciseId: z.number().int().positive(),
  given: z.string().max(255),
  source: z.enum(["exercises", "daily", "lesson", "game"]),
});

export async function answerExercise(input: {
  exerciseId: number;
  given: string;
  source: "exercises" | "daily" | "lesson" | "game";
}): Promise<AttemptResult | { error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid answer." };

  const user = await requireUser();
  const result = await submitAttempt(
    user,
    parsed.data.exerciseId,
    parsed.data.given,
    parsed.data.source,
  );
  if (!result) return { error: "Exercise not found." };

  // The daily challenge tracks its own completion counter.
  if (parsed.data.source === "daily") {
    const date = dayKey();
    const challenge = await prisma.dailyChallenge.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });

    if (challenge && !challenge.completed) {
      const answered = challenge.answered + 1;
      const ids = (challenge.exerciseIds as number[]) ?? [];
      await prisma.dailyChallenge.update({
        where: { id: challenge.id },
        data: {
          answered,
          score: challenge.score + (result.correct ? 1 : 0),
          completed: answered >= ids.length,
        },
      });
    }
    revalidatePath("/daily");
  }

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return result;
}
