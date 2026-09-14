import { prisma } from "@/lib/db";
import { queryVariants } from "@/lib/search";
import type { Level, Pos } from "@prisma/client";

export type SearchHit = {
  id: number;
  lemma: string;
  level: Level;
  pos: Pos;
  subcategory: string;
  translationsEn: string[];
  article: string | null;
  /** Why this word matched — shown so "isst → essen" is not mysterious. */
  matchedVia: string | null;
  matchedForm: string | null;
  rank: number;
};

const RANK = { LEMMA: 0, FORM: 1, TRANSLATION: 2, LEMMA_PREFIX: 3, TRANSLATION_PREFIX: 4 };

/**
 * Resolves a query across German lemmas, inflected forms and English glosses.
 *
 * Exact matches always outrank prefix matches, so searching "essen" leads with
 * the verb itself rather than with "Essen" the noun's prefix neighbours.
 */
export async function searchWords(
  raw: string,
  opts: { limit?: number; level?: Level | null } = {},
): Promise<SearchHit[]> {
  const variants = queryVariants(raw);
  if (variants.length === 0) return [];

  const limit = opts.limit ?? 40;
  const levelFilter = opts.level ? { level: opts.level } : {};

  const [lemmaExact, formExact, transExact, lemmaPrefix, transPrefix] = await Promise.all([
    prisma.word.findMany({
      where: { searchLemma: { in: variants }, ...levelFilter },
      include: { noun: true },
      take: limit,
    }),
    prisma.wordForm.findMany({
      where: { searchForm: { in: variants }, word: levelFilter },
      include: { word: { include: { noun: true } } },
      take: limit,
    }),
    prisma.translation.findMany({
      where: { searchText: { in: variants }, word: levelFilter },
      include: { word: { include: { noun: true } } },
      take: limit,
    }),
    prisma.word.findMany({
      where: { searchLemma: { startsWith: variants[0] }, ...levelFilter },
      include: { noun: true },
      take: limit,
    }),
    prisma.translation.findMany({
      where: { searchText: { startsWith: variants[0] }, word: levelFilter },
      include: { word: { include: { noun: true } } },
      take: limit,
    }),
  ]);

  const byId = new Map<number, SearchHit>();

  const add = (
    word: { id: number; lemma: string; level: Level; pos: Pos; subcategory: string; translationsEn: unknown; noun?: { article: string } | null },
    rank: number,
    matchedVia: string | null,
    matchedForm: string | null,
  ) => {
    const existing = byId.get(word.id);
    if (existing && existing.rank <= rank) return;

    byId.set(word.id, {
      id: word.id,
      lemma: word.lemma,
      level: word.level,
      pos: word.pos,
      subcategory: word.subcategory,
      translationsEn: (word.translationsEn as string[]) ?? [],
      article: word.noun?.article ?? null,
      matchedVia,
      matchedForm,
      rank,
    });
  };

  for (const w of lemmaExact) add(w, RANK.LEMMA, null, null);
  for (const f of formExact) {
    // A form that IS the lemma adds no information — don't label it.
    if (f.formType === "lemma") add(f.word, RANK.LEMMA, null, null);
    else add(f.word, RANK.FORM, f.formType, f.form);
  }
  for (const t of transExact) add(t.word, RANK.TRANSLATION, "translation", t.text);
  for (const w of lemmaPrefix) add(w, RANK.LEMMA_PREFIX, null, null);
  for (const t of transPrefix) add(t.word, RANK.TRANSLATION_PREFIX, "translation", t.text);

  return [...byId.values()]
    .sort((a, b) => a.rank - b.rank || a.lemma.localeCompare(b.lemma, "de"))
    .slice(0, limit);
}

export async function getWordDetail(id: number) {
  return prisma.word.findUnique({
    where: { id },
    include: { noun: true, verb: true, adj: true, forms: { orderBy: { id: "asc" } } },
  });
}

/** A level-and-category browse listing, used when the search box is empty. */
export async function browseWords(opts: {
  level?: Level | null;
  pos?: Pos[] | null;
  subcategory?: string | null;
  limit?: number;
}) {
  return prisma.word.findMany({
    where: {
      ...(opts.level ? { level: opts.level } : {}),
      ...(opts.pos?.length ? { pos: { in: opts.pos } } : {}),
      ...(opts.subcategory ? { subcategory: opts.subcategory } : {}),
    },
    include: { noun: true },
    orderBy: [{ level: "asc" }, { lemma: "asc" }],
    take: opts.limit ?? 60,
  });
}
