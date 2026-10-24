import { prisma } from "@/lib/db";
import { normalize } from "@/lib/search";

export type DictGloss = { lemma: string; gloss: string; isNoun: boolean };

/**
 * Articles, pronoun forms and preposition contractions. The word list is
 * lemma-based, so these surface forms never resolve through it.
 */
const FUNCTION_WORDS: Record<string, string> = {
  der: "the", die: "the", das: "the", dem: "the (to the)", den: "the", des: "of the",
  ein: "a, an", eine: "a, an", einen: "a, an", einem: "a, an (to a)", einer: "a, an", eines: "of a",
  kein: "no, not a", keine: "no, not any", keinen: "no, not a", keinem: "no, not a",
  mein: "my", meine: "my", meinen: "my", meinem: "my", meiner: "my",
  dein: "your", deine: "your", deinen: "your", deinem: "your",
  sein: "his, its", seine: "his, its", seinen: "his, its", seinem: "his, its",
  ihr: "her, their / you (pl.)", ihre: "her, their", ihren: "her, their", ihrem: "her, their",
  unser: "our", unsere: "our", unseren: "our", unserem: "our",
  jeden: "every", jede: "every", jedes: "every", jeder: "every", jedem: "every",
  am: "at the, on the (an dem)", im: "in the (in dem)", ins: "into the (in das)",
  zum: "to the (zu dem)", zur: "to the (zu der)", beim: "at the (bei dem)",
  vom: "from the (von dem)", ans: "to the (an das)", aufs: "onto the (auf das)",
  mir: "(to) me", dir: "(to) you", ihm: "(to) him", uns: "us", euch: "you (pl.)", sich: "oneself (reflexive)",
  auch: "also, too", dann: "then", nicht: "not", nur: "only", so: "so, like this", doch: "but, yes (after a negative)",
  da: "there, then", wie: "how, like", wer: "who", ob: "whether", alles: "everything", viele: "many",
  andere: "other", hause: "home (zu Hause = at home)",
};

/**
 * Glosses for every word in a reading text, from the dictionary's lemma and
 * inflection indexes. Keyed by normalized token; nouns and non-nouns are both
 * kept so the reader can pick by capitalization ("Essen" vs "essen").
 */
export async function dictionaryGlosses(body: string): Promise<Record<string, DictGloss[]>> {
  const tokens = [...new Set(body.split(/\s+/).map(normalize).filter(Boolean))];
  if (tokens.length === 0) return {};

  const [lemmas, forms] = await Promise.all([
    prisma.word.findMany({ where: { searchLemma: { in: tokens } } }),
    prisma.wordForm.findMany({ where: { searchForm: { in: tokens } }, include: { word: true } }),
  ]);

  const out: Record<string, DictGloss[]> = {};
  const seen = new Set<string>();
  const add = (key: string, w: { id: number; lemma: string; pos: string; translationsEn: unknown }) => {
    const translations = (w.translationsEn as string[]) ?? [];
    if (translations.length === 0 || seen.has(`${key}:${w.id}`)) return;
    seen.add(`${key}:${w.id}`);
    (out[key] ??= []).push({ lemma: w.lemma, gloss: translations.slice(0, 3).join(", "), isNoun: w.pos === "NOUN" });
  };

  // Lemma matches first, so they win over a form that happens to collide.
  for (const w of lemmas) add(w.searchLemma, w);
  for (const f of forms) add(f.searchForm, f.word);

  for (const t of tokens) {
    if (!out[t] && FUNCTION_WORDS[t]) out[t] = [{ lemma: t, gloss: FUNCTION_WORDS[t], isNoun: false }];
  }

  return out;
}
