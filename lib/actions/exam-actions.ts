"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { recordActivity } from "@/lib/stats";

const schema = z.object({
  examItemId: z.number().int().positive(),
  score: z.number().int().min(0),
  total: z.number().int().min(0),
  detail: z.record(z.string(), z.unknown()).optional(),
  mistakes: z
    .array(
      z.object({
        prompt: z.string().max(500),
        expected: z.string().max(255),
        given: z.string().max(255),
      }),
    )
    .max(50)
    .optional(),
});

export async function recordExamAttempt(input: {
  examItemId: number;
  score: number;
  total: number;
  detail?: Record<string, unknown>;
  mistakes?: { prompt: string; expected: string; given: string }[];
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid exam result." };

  const user = await requireUser();
  const item = await prisma.examItem.findUnique({ where: { id: parsed.data.examItemId } });
  if (!item) return { error: "Exam item not found." };

  await prisma.examAttempt.create({
    data: {
      userId: user.id,
      examItemId: item.id,
      section: item.section,
      score: parsed.data.score,
      total: parsed.data.total,
      detail: (parsed.data.detail ?? undefined) as never,
    },
  });

  if (parsed.data.mistakes?.length) {
    await prisma.mistake.createMany({
      data: parsed.data.mistakes.map((m) => ({
        userId: user.id,
        kind: "EXAM" as const,
        refId: item.id,
        prompt: m.prompt,
        expected: m.expected,
        given: m.given,
      })),
    });
  }

  await recordActivity(user.id, { exercises: parsed.data.total, xp: parsed.data.score * 2 });

  revalidatePath("/exam");
  revalidatePath("/progress");
  revalidatePath("/insights");
  return { ok: true };
}
