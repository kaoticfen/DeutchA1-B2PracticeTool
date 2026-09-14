import { describe, expect, it } from "vitest";
import { dedupeImported, dedupeWords, lowestLevel } from "./merge-words";
import type { ImportedWord, SeedWord } from "./seed-schema";

const noun = (lemma: string, level: SeedWord["level"], extra: Partial<SeedWord> = {}): SeedWord => ({
  lemma,
  level,
  pos: "NOUN",
  subcategory: "noun-das",
  translationsEn: ["house"],
  noun: { article: "das", plural: `${lemma}er` },
  ...extra,
});

const staged = (
  lemma: string,
  level: ImportedWord["level"],
  extra: Partial<ImportedWord> = {},
): ImportedWord => ({
  lemma,
  level,
  translationsEn: ["house"],
  source: "deck",
  ...extra,
});

describe("lowestLevel", () => {
  it("returns the earlier level", () => {
    expect(lowestLevel("A2", "B1")).toBe("A2");
    expect(lowestLevel("B1", "A2")).toBe("A2");
  });
  it("is stable when both are equal", () => {
    expect(lowestLevel("B2", "B2")).toBe("B2");
  });
  it("treats A1 as lowest", () => {
    expect(lowestLevel("B2", "A1")).toBe("A1");
  });
});

describe("dedupeWords", () => {
  it("keeps a word at the level where it is first introduced", () => {
    const { words } = dedupeWords([noun("Haus", "B1"), noun("Haus", "A2")]);
    expect(words).toHaveLength(1);
    expect(words[0].level).toBe("A2");
  });

  it("gives the same answer whichever order the files were read in", () => {
    const forward = dedupeWords([noun("Haus", "A1"), noun("Haus", "B1")]).words[0];
    const reverse = dedupeWords([noun("Haus", "B1"), noun("Haus", "A1")]).words[0];
    expect(forward.level).toBe("A1");
    expect(reverse.level).toBe("A1");
  });

  it("treats different parts of speech as different words", () => {
    const verb: SeedWord = {
      lemma: "Essen",
      level: "A1",
      pos: "VERB",
      subcategory: "verb-irregular",
      translationsEn: ["to eat"],
      verb: {
        isSeparable: false,
        isIrregular: true,
        auxiliary: "haben",
        praesens: { ich: "esse", du: "isst", er: "isst", wir: "essen", ihr: "esst", sie: "essen" },
      },
    };
    const { words } = dedupeWords([noun("Essen", "A1"), verb]);
    expect(words).toHaveLength(2);
  });

  it("keeps sie and Sie distinct", () => {
    const a: SeedWord = { lemma: "sie", level: "A1", pos: "OTHER", subcategory: "pronoun", translationsEn: ["she"] };
    const b: SeedWord = { lemma: "Sie", level: "A1", pos: "OTHER", subcategory: "pronoun", translationsEn: ["you (formal)"] };
    expect(dedupeWords([a, b]).words).toHaveLength(2);
  });

  it("unions the translations from both sources", () => {
    const { words } = dedupeWords([
      noun("Haus", "A2", { translationsEn: ["house"] }),
      noun("Haus", "B1", { translationsEn: ["building", "house"] }),
    ]);
    expect(words[0].translationsEn).toEqual(["house", "building"]);
  });

  it("does not duplicate translations that differ only by case", () => {
    const { words } = dedupeWords([
      noun("Haus", "A2", { translationsEn: ["House"] }),
      noun("Haus", "B1", { translationsEn: ["house"] }),
    ]);
    expect(words[0].translationsEn).toHaveLength(1);
  });

  it("takes detail from the other source when the canonical entry lacks it", () => {
    const withoutExample = noun("Haus", "A2");
    const withExample = noun("Haus", "B1", { exampleDe: "Das Haus ist groß.", exampleEn: "The house is big." });
    const { words } = dedupeWords([withoutExample, withExample]);
    expect(words[0].level).toBe("A2");
    expect(words[0].exampleDe).toBe("Das Haus ist groß.");
    expect(words[0].exampleEn).toBe("The house is big.");
  });

  it("keeps the lower level's own example when it has one", () => {
    const a = noun("Haus", "A2", { exampleDe: "A2 Satz.", exampleEn: "A2 sentence." });
    const b = noun("Haus", "B1", { exampleDe: "B1 Satz.", exampleEn: "B1 sentence." });
    const { words } = dedupeWords([a, b]);
    expect(words[0].exampleDe).toBe("A2 Satz.");
    expect(words[0].exampleEn).toBe("A2 sentence.");
  });

  it("reports what it merged", () => {
    const { report } = dedupeWords([noun("Haus", "B1"), noun("Haus", "A2"), noun("Buch", "A1")]);
    expect(report).toEqual({ total: 3, unique: 2, merged: 1, relabelled: 1 });
  });

  it("does not count a same-level duplicate as a relabel", () => {
    const { report } = dedupeWords([noun("Haus", "A2"), noun("Haus", "A2")]);
    expect(report.merged).toBe(1);
    expect(report.relabelled).toBe(0);
  });

  it("passes a list with no duplicates through unchanged", () => {
    const input = [noun("Haus", "A1"), noun("Buch", "A2")];
    const { words, report } = dedupeWords(input);
    expect(words).toHaveLength(2);
    expect(report.merged).toBe(0);
  });

  it("handles an empty list", () => {
    expect(dedupeWords([]).words).toEqual([]);
  });

  it("collapses a word restated across three levels to the lowest", () => {
    const { words } = dedupeWords([noun("Haus", "B1"), noun("Haus", "A2"), noun("Haus", "A1")]);
    expect(words).toHaveLength(1);
    expect(words[0].level).toBe("A1");
  });
});

describe("dedupeImported", () => {
  it("keeps the lowest level", () => {
    const { words } = dedupeImported([staged("Haus", "B1"), staged("Haus", "A2")]);
    expect(words).toHaveLength(1);
    expect(words[0].level).toBe("A2");
  });

  it("keeps grammar facts parsed from whichever deck had them", () => {
    const { words } = dedupeImported([
      staged("Haus", "A2"),
      staged("Haus", "B1", { article: "das", plural: "Häuser", posGuess: "NOUN" }),
    ]);
    expect(words[0].article).toBe("das");
    expect(words[0].plural).toBe("Häuser");
    expect(words[0].posGuess).toBe("NOUN");
  });

  it("records both decks in the provenance", () => {
    const { words } = dedupeImported([
      staged("Haus", "A2", { source: "goethe-a2" }),
      staged("Haus", "B1", { source: "goethe-b1" }),
    ]);
    expect(words[0].source).toBe("goethe-a2+goethe-b1");
  });

  it("leaves a single source untouched", () => {
    const { words } = dedupeImported([
      staged("Haus", "A2", { source: "goethe-a2" }),
      staged("Haus", "A2", { source: "goethe-a2" }),
    ]);
    expect(words[0].source).toBe("goethe-a2");
  });

  it("is order-independent", () => {
    const a = dedupeImported([staged("Haus", "A1"), staged("Haus", "B1")]).words[0];
    const b = dedupeImported([staged("Haus", "B1"), staged("Haus", "A1")]).words[0];
    expect(a.level).toBe("A1");
    expect(b.level).toBe("A1");
  });
});
