import { describe, expect, it } from "vitest";
import { normalize, queryVariants, stripArticle, stripInfinitiveTo } from "./search";

describe("normalize", () => {
  it("folds umlauts to their two-letter forms", () => {
    expect(normalize("Häuser")).toBe("haeuser");
    expect(normalize("Öl")).toBe("oel");
    expect(normalize("über")).toBe("ueber");
  });

  it("folds eszett to ss", () => {
    expect(normalize("Straße")).toBe("strasse");
  });

  it("lowercases and trims", () => {
    expect(normalize("  Hund  ")).toBe("hund");
  });

  it("strips punctuation but keeps word spacing", () => {
    expect(normalize("sich freuen, auf")).toBe("sich freuen auf");
  });

  it("collapses repeated whitespace", () => {
    expect(normalize("auf   dem")).toBe("auf dem");
  });

  it("returns empty string for punctuation-only input", () => {
    expect(normalize("???")).toBe("");
  });
});

describe("stripArticle", () => {
  it("removes a definite article", () => {
    expect(stripArticle("der Hund")).toBe("Hund");
  });
  it("leaves an article-less noun alone", () => {
    expect(stripArticle("Hund")).toBe("Hund");
  });
  it("does not strip a word that merely starts with 'die'", () => {
    expect(stripArticle("dienen")).toBe("dienen");
  });
});

describe("stripInfinitiveTo", () => {
  it("drops a leading 'to'", () => {
    expect(stripInfinitiveTo("to eat")).toBe("eat");
  });
  it("does not touch a word starting with 'to'", () => {
    expect(stripInfinitiveTo("together")).toBe("together");
  });
});

describe("queryVariants", () => {
  it("yields the article-stripped form for a noun query", () => {
    expect(queryVariants("der Hund")).toContain("hund");
  });

  it("yields the bare verb for an English infinitive query", () => {
    expect(queryVariants("to eat")).toContain("eat");
  });

  it("deduplicates when the variants collapse to one string", () => {
    expect(queryVariants("Hund")).toEqual(["hund"]);
  });

  it("returns an empty list for blank input", () => {
    expect(queryVariants("   ")).toEqual([]);
  });
});
