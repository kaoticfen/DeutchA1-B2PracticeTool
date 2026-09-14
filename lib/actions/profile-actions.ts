"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isLevel } from "@/lib/levels";
import type { Level } from "@prisma/client";

const schema = z.object({
  level: z.string().refine(isLevel),
  levelMode: z.enum(["AUTO", "MANUAL"]),
});

export async function updateLevelSettings(_prev: unknown, formData: FormData) {
  const user = await requireUser();

  const parsed = schema.safeParse({
    level: formData.get("level"),
    levelMode: formData.get("levelMode"),
  });
  if (!parsed.success) return { error: "Invalid settings." };

  await prisma.user.update({
    where: { id: user.id },
    data: { currentLevel: parsed.data.level as Level, levelMode: parsed.data.levelMode },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Wipes review history and progress but keeps the account. */
export async function resetProgress() {
  const user = await requireUser();

  await prisma.$transaction([
    prisma.reviewLog.deleteMany({ where: { userId: user.id } }),
    prisma.srsCard.deleteMany({ where: { userId: user.id } }),
    prisma.exerciseAttempt.deleteMany({ where: { userId: user.id } }),
    prisma.gameSession.deleteMany({ where: { userId: user.id } }),
    prisma.examAttempt.deleteMany({ where: { userId: user.id } }),
    prisma.dailyChallenge.deleteMany({ where: { userId: user.id } }),
    prisma.mistake.deleteMany({ where: { userId: user.id } }),
    prisma.activityDay.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { currentLevel: "A1" } }),
  ]);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true };
}
