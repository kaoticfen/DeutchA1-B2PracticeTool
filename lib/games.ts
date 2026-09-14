import { prisma } from "@/lib/db";
import { shuffle } from "@/lib/exercises";
import type { Level } from "@prisma/client";

export const GAME_META = {
  WORD_MATCH: {
    slug: "word-match",
    name: "Word Match",
    icon: "⇄",
    blurb: "Pair each German word with its English meaning before the list runs out.",
  },
  GENDER_BATTLE: {
    slug: "gender-battle",
    name: "Gender Battle",
    icon: "⚥",
    blurb: "der, die or das? Rapid-fire article drilling.",
  },
  LISTENING_QUIZ: {
    slug: "listening-quiz",
    name: "Listening Quiz",
    icon: "♪",
    blurb: "Hear a German word and pick what you heard.",
  },
  FILL_BLANK: {
    slug: "fill-blank",
    name: "Fill in the Blank",
    icon: "▭",
    blurb: "Complete the sentence with the missing word.",
  },
} as const;

export type GameKey = keyof typeof GAME_META;

export const GAME_BY_SLUG = Object.fromEntries(
  Object.entries(GAME_META).map(([key, meta]) => [meta.slug, key as GameKey]),
) as Record<string, GameKey>;

export type MatchPair = { id: number; de: string; en: string };
export type GenderRound = { id: number; lemma: string; answer: string; plural: string };
export type ListeningRound = { id: number; lemma: string; options: string[]; translation: string };

const ROUND_SIZE = 8;

/** Words that actually have a usable English gloss, at or below the level. */
async function wordPool(level: Level | null, where: object = {}, take = 60) {
  return prisma.word.findMany({
    where: { ...(level ? { level } : {}), ...where },
    include: { noun: true },
    take,
    orderBy: { id: "asc" },
  });
}

export async function wordMatchRound(level: Level | null): Promise<MatchPair[]> {
  const pool = await wordPool(level);
  return shuffle(pool)
    .map((w) => ({
      id: w.id,
      de: w.noun ? `${w.noun.article} ${w.lemma}` : w.lemma,
      en: ((w.translationsEn as string[]) ?? [])[0] ?? "",
    }))
    .filter((p) => p.en.length > 0)
    .slice(0, 6);
}

export async function genderBattleRound(level: Level | null): Promise<GenderRound[]> {
  const pool = await prisma.word.findMany({
    where: { ...(level ? { level } : {}), pos: "NOUN", noun: { isNot: null } },
    include: { noun: true },
    take: 80,
  });

  return shuffle(pool)
    .filter((w) => w.noun)
    .slice(0, ROUND_SIZE)
    .map((w) => ({
      id: w.id,
      lemma: w.lemma,
      answer: w.noun!.article,
      plural: w.noun!.plural,
    }));
}

export async function listeningRound(level: Level | null): Promise<ListeningRound[]> {
  const pool = await wordPool(level, {}, 80);
  const chosen = shuffle(pool).slice(0, ROUND_SIZE);

  return chosen.map((w) => {
    // Distractors come from the same pool so the choices look plausible.
    const distractors = shuffle(pool.filter((p) => p.id !== w.id))
      .slice(0, 3)
      .map((p) => p.lemma);

    return {
      id: w.id,
      lemma: w.lemma,
      options: shuffle([w.lemma, ...distractors]),
      translation: ((w.translationsEn as string[]) ?? [])[0] ?? "",
    };
  });
}

export async function recordGame(
  userId: number,
  game: GameKey,
  score: number,
  total: number,
  durationMs: number,
) {
  await prisma.gameSession.create({
    data: { userId, game, score, total, durationMs },
  });
}
