import { describe, expect, it } from "vitest";
import { expandPlural, guessPos, parseGermanField, parseTranslations } from "./anki-parse";
import { cleanField } from "./apkg";

describe("cleanField", () => {
  it("strips HTML tags", () => {
    expect(cleanField("<b>das Haus</b>")).toBe("das Haus");
  });
  it("strips Anki sound references", () => {
    expect(cleanField("gehen [sound:gehen.mp3]")).toBe("gehen");
  });
  it("decodes entities and non-breaking spaces", () => {
    expect(cleanField("der&nbsp;Hund &amp; die Katze")).toBe("der Hund & die Katze");
  });
  it("turns <br> into a space rather than joining words", () => {
    expect(cleanField("Haus<br>Häuser")).toBe("Haus Häuser");
  });
});

describe("expandPlural", () => {
  it("appends a plain suffix", () => {
    expect(expandPlural("Hund", "-e")).toBe("Hunde");
  });
  it("appends -s for loanwords", () => {
    expect(expandPlural("Auto", "-s")).toBe("Autos");
  });
  it("applies an umlaut with a suffix", () => {
    expect(expandPlural("Haus", "¨-er")).toBe("Häuser");
  });
  it("applies an umlaut with no suffix", () => {
    expect(expandPlural("Vater", "¨-")).toBe("Väter");
  });
  it("umlauts the au diphthong as a unit", () => {
    expect(expandPlural("Baum", "¨-e")).toBe("Bäume");
  });
  it("handles an unchanged plural", () => {
    expect(expandPlural("Lehrer", "-")).toBe("Lehrer");
  });
  it("passes through an already-spelled-out plural", () => {
    expect(expandPlural("Apfel", "Äpfel")).toBe("Äpfel");
  });
  it("returns null for notation it cannot read", () => {
    expect(expandPlural("Haus", "???")).toBeNull();
    expect(expandPlural("Haus", "")).toBeNull();
  });
  it("returns null when an umlaut is requested but impossible", () => {
    expect(expandPlural("Kind", "¨-er")).toBeNull();
  });
});

describe("parseGermanField", () => {
  it("reads article, lemma and abbreviated plural", () => {
    expect(parseGermanField("das Haus, ¨-er")).toEqual({
      lemma: "Haus", article: "das", plural: "Häuser", posGuess: "NOUN",
    });
  });

  it("reads a spelled-out plural introduced by die", () => {
    expect(parseGermanField("der Apfel, die Äpfel")).toEqual({
      lemma: "Apfel", article: "der", plural: "Äpfel", posGuess: "NOUN",
    });
  });

  it("reads the article-last format", () => {
    expect(parseGermanField("Haus, das")).toEqual({
      lemma: "Haus", article: "das", plural: null, posGuess: "NOUN",
    });
  });

  it("reads a noun with no plural given", () => {
    expect(parseGermanField("die Frau")).toEqual({
      lemma: "Frau", article: "die", plural: null, posGuess: "NOUN",
    });
  });

  it("reads a bare infinitive as a verb", () => {
    expect(parseGermanField("gehen")).toEqual({
      lemma: "gehen", article: null, plural: null, posGuess: "VERB",
    });
  });

  it("reads a reflexive verb", () => {
    expect(parseGermanField("sich freuen")).toEqual({
      lemma: "sich freuen", article: null, plural: null, posGuess: "VERB",
    });
  });

  it("strips HTML and sound tags before parsing", () => {
    expect(parseGermanField("<b>das Haus</b>, ¨-er [sound:haus.mp3]").lemma).toBe("Haus");
  });

  it("drops parenthetical notes", () => {
    expect(parseGermanField("gehen (irregular)").lemma).toBe("gehen");
  });

  it("keeps only the headword when several forms are listed", () => {
    expect(parseGermanField("schnell, rasch").lemma).toBe("schnell");
  });

  it("leaves pos null when it cannot tell", () => {
    // An adjective looks like nothing in particular from the word alone.
    expect(parseGermanField("schnell").posGuess).toBeNull();
  });

  it("handles an empty field without throwing", () => {
    expect(parseGermanField("").lemma).toBe("");
  });

  it("does not mistake a capitalised noun's plural notation for a lemma", () => {
    expect(parseGermanField("der Lehrer, -").plural).toBe("Lehrer");
  });
});

describe("guessPos", () => {
  it("recognises prepositions by lookup", () => {
    expect(guessPos("durch")).toBe("PREP");
    expect(guessPos("zwischen")).toBe("PREP");
  });
  it("treats a capitalised word as a noun", () => {
    expect(guessPos("Fenster")).toBe("NOUN");
  });
  it("recognises infinitive endings", () => {
    expect(guessPos("arbeiten")).toBe("VERB");
    expect(guessPos("sammeln")).toBe("VERB");
    expect(guessPos("ändern")).toBe("VERB");
  });
  it("returns null for an adjective", () => {
    expect(guessPos("schnell")).toBeNull();
  });
  it("does not call a capitalised preposition a preposition", () => {
    // "Durch" at the start of a sentence should not outrank the noun rule.
    expect(guessPos("Durch")).toBe("NOUN");
  });
});

describe("parseTranslations", () => {
  it("splits on commas", () => {
    expect(parseTranslations("house, building")).toEqual(["house", "building"]);
  });
  it("splits on semicolons and slashes", () => {
    expect(parseTranslations("fast; quick / rapid")).toEqual(["fast", "quick", "rapid"]);
  });
  it("drops parenthetical notes", () => {
    expect(parseTranslations("to go (on foot)")).toEqual(["to go"]);
  });
  it("caps the number of glosses", () => {
    expect(parseTranslations("a, b, c, d, e", 3)).toHaveLength(3);
  });
  it("returns an empty array for an empty field", () => {
    expect(parseTranslations("")).toEqual([]);
  });
  it("strips HTML first", () => {
    expect(parseTranslations("<i>house</i>")).toEqual(["house"]);
  });
});
