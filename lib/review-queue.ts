import { prisma } from "@/lib/db";
import { buildQueue } from "@/lib/srs";
import type { Level, Pos } from "@prisma/client";

export type ReviewCard = {
  wordId: number;
  lemma: string;
  article: string | null;
  translationsEn: string[];
  exampleDe: string | null;
  exampleEn: string | null;
  level: Level;
  pos: Pos;
  subcategory: string;
  state: "KNOWN" | "SHAKY" | "UNKNOWN" | null;
  isNew: boolean;
};

export const SESSION_SIZE = 20;
export const MAX_NEW_PER_SESSION = 10;

/**
 * Builds a review session: everything due now, topped up with unseen words
 * from the active filter. Filters apply to new cards AND to due cards, so
 * picking "Modal verbs" really does drill only modal verbs.
 */
export async function buildReviewSession(
  userId: number,
  filter: { level?: Level | null; pos?: Pos[] | null; subcategory?: string | null },
): Promise<{ cards: ReviewCard[]; dueTotal: number }> {
  const wordWhere = {
    ...(filter.level ? { level: filter.level } : {}),
    ...(filter.pos?.length ? { pos: { in: filter.pos } } : {}),
    ...(filter.subcategory ? { subcategory: filter.subcategory } : {}),
  };

  const dueCards = await prisma.srsCard.findMany({
    where: { userId, dueAt: { lte: new Date() }, word: wordWhere },
    include: { word: { include: { noun: true } } },
    orderBy: { dueAt: "asc" },
    take: SESSION_SIZE,
  });

  const unseen = await prisma.word.findMany({
    where: { ...wordWhere, srsCards: { none: { userId } } },
    include: { noun: true },
    orderBy: [{ level: "asc" }, { id: "asc" }],
    take: MAX_NEW_PER_SESSION,
  });

  const { due, fresh } = buildQueue(dueCards, unseen, {
    sessionSize: SESSION_SIZE,
    maxNew: MAX_NEW_PER_SESSION,
  });

  const cards: ReviewCard[] = [
    ...due.map((c) => ({
      wordId: c.wordId,
      lemma: c.word.lemma,
      article: c.word.noun?.article ?? null,
      translationsEn: (c.word.translationsEn as string[]) ?? [],
      exampleDe: c.word.exampleDe,
      exampleEn: c.word.exampleEn,
      level: c.word.level,
      pos: c.word.pos,
      subcategory: c.word.subcategory,
      state: c.state as ReviewCard["state"],
      isNew: false,
    })),
    ...fresh.map((w) => ({
      wordId: w.id,
      lemma: w.lemma,
      article: w.noun?.article ?? null,
      translationsEn: (w.translationsEn as string[]) ?? [],
      exampleDe: w.exampleDe,
      exampleEn: w.exampleEn,
      level: w.level,
      pos: w.pos,
      subcategory: w.subcategory,
      state: null,
      isNew: true,
    })),
  ];

  const dueTotal = await prisma.srsCard.count({
    where: { userId, dueAt: { lte: new Date() }, word: wordWhere },
  });

  return { cards, dueTotal };
}
