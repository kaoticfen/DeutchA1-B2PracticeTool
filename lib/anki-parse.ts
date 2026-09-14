/**
 * Turns a raw Anki field value into as much structured German as can be read
 * off it with confidence.
 *
 * Wordlist decks write their entries in a handful of conventional shapes:
 *   "das Haus, ¨-er"          article + noun + abbreviated plural
 *   "der Apfel, die Äpfel"    article + noun + spelled-out plural
 *   "Haus, das"               noun then article
 *   "gehen"                   bare infinitive
 *   "sich freuen"             reflexive verb
 *
 * Anything this can't read confidently is left null on purpose — the grammar
 * backfill fills those in rather than the importer guessing and being wrong.
 */

import { cleanField } from "./apkg";

export type ParsedEntry = {
  lemma: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  posGuess: "VERB" | "NOUN" | "ADJ" | "PREP" | "ADV" | "OTHER" | null;
};

const ARTICLES = ["der", "die", "das"] as const;
type Article = (typeof ARTICLES)[number];

/** Prepositions are a closed class, so they can be recognised by lookup. */
const PREPOSITIONS = new Set([
  "an", "auf", "aus", "bei", "bis", "durch", "für", "gegen", "gegenüber", "hinter", "in",
  "mit", "nach", "neben", "ohne", "seit", "über", "um", "unter", "von", "vor", "während",
  "wegen", "trotz", "statt", "zu", "zwischen", "innerhalb", "außerhalb", "entlang", "ab",
]);

/**
 * Expand Anki's shorthand plural notation against the singular.
 *   "-e"    -> Hund + e      = Hunde
 *   "¨-er"  -> Haus umlauted + er = Häuser
 *   "-"     -> unchanged
 *   "-s"    -> Auto + s      = Autos
 * Returns null when the notation isn't one we can expand safely.
 */
export function expandPlural(singular: string, notation: string): string | null {
  const n = notation.trim();
  if (!n) return null;

  // Already a full word (contains letters beyond the suffix markers).
  if (/^[A-ZÄÖÜ]/.test(n) && !n.startsWith("-") && !n.startsWith("¨")) return n;

  const umlaut = n.startsWith("¨") || n.startsWith("̈");
  const suffixMatch = /-(.*)$/.exec(n.replace(/^[¨̈]/, ""));
  if (!suffixMatch) return null;

  const suffix = suffixMatch[1].trim();
  let stem = singular;

  if (umlaut) {
    // German plural umlaut lands on the last umlautable stem vowel — which is
    // also what gives compounds the right result (Bahnhof -> Bahnhöfe).
    // "au" is a digraph and umlauts as a unit to "äu" (Haus -> Häuser), so a
    // "u" that is the second half of "au" must not be umlauted on its own.
    const map: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };

    let idx = -1;
    for (let i = stem.length - 1; i >= 0; i--) {
      if (map[stem[i]]) { idx = i; break; }
    }
    if (idx === -1) return null;

    const isAu = idx > 0 && stem[idx].toLowerCase() === "u" && stem[idx - 1].toLowerCase() === "a";
    if (isAu) {
      stem = stem.slice(0, idx - 1) + (stem[idx - 1] === "A" ? "Äu" : "äu") + stem.slice(idx + 1);
    } else {
      stem = stem.slice(0, idx) + map[stem[idx]] + stem.slice(idx + 1);
    }
  }

  return stem + suffix;
}

export function parseGermanField(raw: string): ParsedEntry {
  const text = cleanField(raw);

  // Some decks put extra senses in parentheses — keep the headword only.
  const head = text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  // "das Haus, ¨-er" / "der Apfel, die Äpfel"
  const withArticle = /^(der|die|das)\s+([A-Za-zÄÖÜäöüß-]+)\s*(?:,\s*(.+))?$/.exec(head);
  if (withArticle) {
    const article = withArticle[1] as Article;
    const lemma = withArticle[2];
    const pluralRaw = withArticle[3]?.replace(/^(die|pl\.?)\s*/i, "").trim() ?? "";
    return {
      lemma,
      article,
      plural: pluralRaw ? expandPlural(lemma, pluralRaw) : null,
      posGuess: "NOUN",
    };
  }

  // "Haus, das" — article trailing
  const trailingArticle = /^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]*)\s*,\s*(der|die|das)\b(.*)$/.exec(head);
  if (trailingArticle) {
    const lemma = trailingArticle[1];
    const article = trailingArticle[2] as Article;
    const rest = trailingArticle[3]?.replace(/^[,\s]+/, "").trim() ?? "";
    return {
      lemma,
      article,
      plural: rest ? expandPlural(lemma, rest) : null,
      posGuess: "NOUN",
    };
  }

  // Everything else: take the first comma-separated form as the headword.
  const lemma = head.split(",")[0].trim();
  if (!lemma) return { lemma: "", article: null, plural: null, posGuess: null };

  return { lemma, article: null, plural: null, posGuess: guessPos(lemma) };
}

/**
 * Cheap, conservative part-of-speech guess. Returns null rather than a coin
 * flip — a null just means the backfill decides.
 */
export function guessPos(lemma: string): ParsedEntry["posGuess"] {
  const w = lemma.trim();
  if (!w) return null;

  if (PREPOSITIONS.has(w.toLowerCase()) && !/^[A-ZÄÖÜ]/.test(w)) return "PREP";

  // German capitalises every noun, so a lone capitalised word is a strong signal.
  if (/^[A-ZÄÖÜ][a-zäöüß-]+$/.test(w)) return "NOUN";

  // Reflexive marker is unambiguous.
  if (/^sich\s+\S+/.test(w)) return "VERB";

  // Infinitives end -en / -ern / -eln. "sein" and friends included.
  if (/^[a-zäöüß]+(en|ern|eln)$/.test(w)) return "VERB";

  return null;
}

/** Splits a translation field into separate glosses. */
export function parseTranslations(raw: string, max = 3): string[] {
  const text = cleanField(raw);
  if (!text) return [];

  return text
    .split(/[;,/]|\bor\b/i)
    .map((s) => s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0 && s.length <= 160)
    .slice(0, max);
}
