/**
 * Merges vocabulary that appears in more than one source.
 *
 * Published wordlists are cumulative: the Goethe B1 list restates much of A2,
 * which restates much of A1. Loading those decks naively would let the last
 * file win and relabel basic vocabulary as B1 — which would quietly corrupt
 * every level count the progression engine depends on.
 *
 * The rule is that a word belongs to the level where it is *first introduced*,
 * so merging always keeps the lowest level. Everything here is order-
 * independent: the same inputs produce the same output whatever order the
 * files were read in.
 */

import { LEVELS, type LevelName } from "./levels";
import type { ImportedWord, SeedWord } from "./seed-schema";

const rank = (level: LevelName) => LEVELS.indexOf(level);

/** The earlier of two levels. */
export function lowestLevel(a: LevelName, b: LevelName): LevelName {
  return rank(a) <= rank(b) ? a : b;
}

/** Union of two gloss lists, order-preserving and case-insensitively unique. */
function mergeTranslations(a: string[], b: string[], max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...a, ...b]) {
    const key = t.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t.trim());
    if (out.length === max) break;
  }
  return out;
}

/**
 * Identity of a word. Matches the database's unique constraint, and lemma is
 * case-sensitive because German uses case to distinguish words (sie / Sie).
 */
const wordKey = (w: { lemma: string; pos: string }) => JSON.stringify([w.lemma, w.pos]);

export type MergeReport = {
  total: number;
  unique: number;
  merged: number;
  /** How many merges actually moved a word to a lower level. */
  relabelled: number;
};

/**
 * Collapses duplicates, keeping the lowest level and the richest detail.
 * Returns the merged list plus a report, so the seeder can say what it did.
 */
export function dedupeWords(words: SeedWord[]): { words: SeedWord[]; report: MergeReport } {
  const byKey = new Map<string, SeedWord>();
  let merged = 0;
  let relabelled = 0;

  for (const incoming of words) {
    const key = wordKey(incoming);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, incoming);
      continue;
    }

    merged++;
    if (existing.level !== incoming.level) relabelled++;

    // The lower-level entry is the canonical one; the other may still carry
    // detail the canonical entry lacks, so take that rather than discard it.
    const primary = rank(existing.level) <= rank(incoming.level) ? existing : incoming;
    const secondary = primary === existing ? incoming : existing;

    byKey.set(key, {
      ...primary,
      level: lowestLevel(existing.level, incoming.level),
      translationsEn: mergeTranslations(primary.translationsEn, secondary.translationsEn),
      exampleDe: primary.exampleDe ?? secondary.exampleDe,
      exampleEn: primary.exampleDe ? primary.exampleEn : (secondary.exampleEn ?? primary.exampleEn),
      noun: primary.noun ?? secondary.noun,
      verb: primary.verb ?? secondary.verb,
      adjective: primary.adjective ?? secondary.adjective,
    });
  }

  return {
    words: [...byKey.values()],
    report: { total: words.length, unique: byKey.size, merged, relabelled },
  };
}

/**
 * The same collapse for staged imports, so a word restated across decks is
 * only ever sent to the model once — at its lowest level.
 */
export function dedupeImported(words: ImportedWord[]): {
  words: ImportedWord[];
  report: MergeReport;
} {
  const byKey = new Map<string, ImportedWord>();
  let merged = 0;
  let relabelled = 0;

  for (const incoming of words) {
    // Staged rows have only a guessed part of speech, so identity is the lemma.
    const key = incoming.lemma;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, incoming);
      continue;
    }

    merged++;
    if (existing.level !== incoming.level) relabelled++;

    const primary = rank(existing.level) <= rank(incoming.level) ? existing : incoming;
    const secondary = primary === existing ? incoming : existing;

    byKey.set(key, {
      ...primary,
      level: lowestLevel(existing.level, incoming.level),
      translationsEn: mergeTranslations(primary.translationsEn, secondary.translationsEn),
      // Facts parsed off a deck are worth keeping from whichever deck had them.
      posGuess: primary.posGuess ?? secondary.posGuess,
      article: primary.article ?? secondary.article,
      plural: primary.plural ?? secondary.plural,
      exampleDe: primary.exampleDe ?? secondary.exampleDe,
      exampleEn: primary.exampleDe ? primary.exampleEn : (secondary.exampleEn ?? primary.exampleEn),
      source:
        primary.source === secondary.source
          ? primary.source
          : `${primary.source}+${secondary.source}`,
    });
  }

  return {
    words: [...byKey.values()],
    report: { total: words.length, unique: byKey.size, merged, relabelled },
  };
}
