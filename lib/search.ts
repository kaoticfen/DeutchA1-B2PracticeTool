/**
 * Search normalization shared by the seed indexer and the dictionary query path.
 * Both sides must use `normalize` or inflection lookup silently stops matching.
 */

const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

/** Lowercase, fold umlauts/ß, strip anything that is not a letter, digit or space. */
export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUT_MAP[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/** Strip a leading article so "der Hund" and "Hund" both find the noun. */
export function stripArticle(input: string): string {
  return input.replace(/^\s*(der|die|das|ein|eine)\s+/i, "");
}

/** Drop the "to " on an English infinitive so "to eat" matches the gloss "eat". */
export function stripInfinitiveTo(input: string): string {
  return input.replace(/^\s*to\s+/i, "");
}

/**
 * Every normalized string a query should be tried as, most specific first.
 * Deduplicated and empty-safe.
 */
export function queryVariants(raw: string): string[] {
  const base = raw.trim();
  const candidates = [base, stripArticle(base), stripInfinitiveTo(base)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const n = normalize(c);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
