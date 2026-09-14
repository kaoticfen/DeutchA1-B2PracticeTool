/**
 * Category -> subcategory tree.
 *
 * Drives the flashcard filter pills AND constrains what `scripts/generate-seed.ts`
 * is allowed to emit, so the UI filters and the seeded data cannot drift apart.
 * `Word.subcategory` must always be one of the `id`s below.
 */

export type PosName = "VERB" | "NOUN" | "ADJ" | "PREP" | "ADV" | "OTHER";

export type SubCategory = { id: string; label: string; hint?: string };
export type Category = { pos: PosName; label: string; subcategories: SubCategory[] };

export const TAXONOMY: Category[] = [
  {
    pos: "VERB",
    label: "Verbs",
    subcategories: [
      { id: "verb-regular", label: "Regular verbs", hint: "Weak verbs with predictable endings" },
      { id: "verb-irregular", label: "Irregular verbs", hint: "Stem-changing / strong verbs" },
      { id: "verb-modal", label: "Modal verbs", hint: "können, müssen, dürfen, wollen, sollen, mögen" },
      { id: "verb-separable", label: "Separable verbs", hint: "Prefix splits off in main clauses" },
      { id: "verb-reflexive", label: "Reflexive verbs", hint: "Used with sich" },
      { id: "verb-auxiliary", label: "Auxiliary verbs", hint: "sein, haben, werden" },
    ],
  },
  {
    pos: "NOUN",
    label: "Nouns",
    subcategories: [
      { id: "noun-der", label: "der (masculine)" },
      { id: "noun-die", label: "die (feminine)" },
      { id: "noun-das", label: "das (neuter)" },
      { id: "noun-plural-only", label: "Plural-only nouns" },
    ],
  },
  {
    pos: "PREP",
    label: "Prepositions",
    subcategories: [
      { id: "prep-accusative", label: "Accusative", hint: "durch, für, gegen, ohne, um" },
      { id: "prep-dative", label: "Dative", hint: "aus, bei, mit, nach, seit, von, zu" },
      { id: "prep-two-way", label: "Two-way", hint: "an, auf, hinter, in, neben, über, unter, vor, zwischen" },
      { id: "prep-genitive", label: "Genitive", hint: "während, wegen, trotz, statt" },
    ],
  },
  {
    pos: "OTHER",
    label: "Other",
    subcategories: [
      { id: "adj-common", label: "Adjectives" },
      { id: "adv-common", label: "Adverbs" },
      { id: "conjunction", label: "Conjunctions" },
      { id: "pronoun", label: "Pronouns" },
      { id: "number", label: "Numbers" },
      { id: "phrase", label: "Phrases" },
    ],
  },
];

/** Which `Pos` values feed each pill. "Other" deliberately gathers several. */
export const CATEGORY_POS: Record<PosName, PosName[]> = {
  VERB: ["VERB"],
  NOUN: ["NOUN"],
  PREP: ["PREP"],
  OTHER: ["ADJ", "ADV", "OTHER"],
  ADJ: ["ADJ"],
  ADV: ["ADV"],
};

const SUBCATEGORY_INDEX = new Map<string, { category: Category; sub: SubCategory }>();
for (const category of TAXONOMY) {
  for (const sub of category.subcategories) {
    SUBCATEGORY_INDEX.set(sub.id, { category, sub });
  }
}

export const ALL_SUBCATEGORY_IDS: string[] = [...SUBCATEGORY_INDEX.keys()];

export function isSubcategoryId(id: string): boolean {
  return SUBCATEGORY_INDEX.has(id);
}

export function subcategoryLabel(id: string): string {
  return SUBCATEGORY_INDEX.get(id)?.sub.label ?? id;
}

export function categoryFor(pos: PosName): Category | undefined {
  return TAXONOMY.find((c) => c.pos === pos) ?? TAXONOMY.find((c) => CATEGORY_POS[c.pos].includes(pos));
}

/** Subcategory ids valid for a pill, used to validate filter query params. */
export function subcategoriesForPill(pos: PosName): string[] {
  return TAXONOMY.find((c) => c.pos === pos)?.subcategories.map((s) => s.id) ?? [];
}
