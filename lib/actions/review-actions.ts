"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { applyGrade } from "@/lib/review";
import type { MasteryStateName } from "@/lib/srs";

const gradeSchema = z.object({
  wordId: z.number().int().positive(),
  state: z.enum(["KNOWN", "SHAKY", "UNKNOWN"]),
});

export type GradeOutcome = {
  ok: boolean;
  dueAt?: string;
  error?: string;
  promotedTo?: string;
};

/** Records one flashcard grading and schedules the next review. */
export async function gradeWord(input: {
  wordId: number;
  state: MasteryStateName;
}): Promise<GradeOutcome> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid review." };

  const user = await requireUser();
  const { dueAt, promotedTo } = await applyGrade(user, parsed.data.wordId, parsed.data.state);

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");

  return { ok: true, dueAt: dueAt.toISOString(), promotedTo: promotedTo ?? undefined };
}
