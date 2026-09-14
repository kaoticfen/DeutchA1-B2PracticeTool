/**
 * Derives every searchable surface form of a word from its seeded details.
 *
 * This is why the dictionary can resolve "isst" -> essen or "Häuser" -> Haus
 * without the generator having to enumerate forms separately.
 */

import { normalize } from "./search";
import type { SeedWord } from "./seed-schema";

export type DerivedForm = { form: string; searchForm: string; formType: string };

export function deriveForms(word: SeedWord): DerivedForm[] {
  const out: DerivedForm[] = [];
  const push = (form: string | null | undefined, formType: string) => {
    if (!form) return;
    const trimmed = form.trim();
    if (!trimmed) return;
    out.push({ form: trimmed, searchForm: normalize(trimmed), formType });
  };

  push(word.lemma, "lemma");

  if (word.verb) {
    const p = word.verb.praesens;
    push(p.ich, "praesens-ich");
    push(p.du, "praesens-du");
    push(p.er, "praesens-er");
    push(p.wir, "praesens-wir");
    push(p.ihr, "praesens-ihr");
    push(p.sie, "praesens-sie");
    push(word.verb.praeteritum, "praeteritum");
    push(word.verb.partizip2, "partizip2");

    // A separable verb's conjugated forms are written "stehe auf"; searching the
    // bare stem ("stehe") should still find it.
    if (word.verb.isSeparable) {
      for (const key of ["ich", "du", "er", "wir", "ihr", "sie"] as const) {
        const stem = p[key].split(/\s+/)[0];
        if (stem && stem !== p[key]) push(stem, `praesens-${key}-stem`);
      }
    }
  }

  if (word.noun) {
    push(word.noun.plural, "plural");
    // "der Hund" should also be findable as written on the card.
    push(`${word.noun.article} ${word.lemma}`, "with-article");
  }

  if (word.adjective) {
    push(word.adjective.comparative, "comparative");
    push(word.adjective.superlative, "superlative");
  }

  return dedupe(out);
}

/** The schema permits duplicate surface forms (e.g. wir/sie are identical). */
function dedupe(forms: DerivedForm[]): DerivedForm[] {
  const seen = new Set<string>();
  return forms.filter((f) => {
    if (!f.searchForm) return false;
    const key = `${f.searchForm}::${f.formType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** English glosses, normalized for the translation search index. */
export function deriveTranslations(word: SeedWord): { text: string; searchText: string }[] {
  const seen = new Set<string>();
  const out: { text: string; searchText: string }[] = [];

  for (const raw of word.translationsEn) {
    for (const variant of [raw, raw.replace(/^to\s+/i, "")]) {
      const searchText = normalize(variant);
      if (!searchText || seen.has(searchText)) continue;
      seen.add(searchText);
      out.push({ text: raw, searchText });
    }
  }

  return out;
}
