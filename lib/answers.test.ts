import { describe, expect, it } from "vitest";
import { checkAnswer, checkAnyAnswer } from "./answers";

describe("checkAnswer", () => {
  it("accepts an exact match", () => {
    expect(checkAnswer("lerne", "lerne")).toBe(true);
  });

  it("ignores case", () => {
    expect(checkAnswer("Lerne", "lerne")).toBe(true);
    expect(checkAnswer("der", "Der")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(checkAnswer("  lerne  ", "lerne")).toBe(true);
  });

  it("accepts an umlaut typed as a digraph", () => {
    expect(checkAnswer("aelter", "älter")).toBe(true);
    expect(checkAnswer("fuenf", "fünf")).toBe(true);
  });

  it("accepts ss typed for eszett", () => {
    expect(checkAnswer("Strasse", "Straße")).toBe(true);
  });

  it("accepts the real umlaut too", () => {
    expect(checkAnswer("älter", "älter")).toBe(true);
  });

  it("rejects a wrong ending", () => {
    expect(checkAnswer("lernst", "lerne")).toBe(false);
  });

  it("rejects a different word", () => {
    expect(checkAnswer("gehe", "lerne")).toBe(false);
  });

  it("rejects an empty answer", () => {
    expect(checkAnswer("", "lerne")).toBe(false);
    expect(checkAnswer("   ", "lerne")).toBe(false);
  });

  it("tolerates a trailing full stop", () => {
    expect(checkAnswer("lerne.", "lerne")).toBe(true);
  });

  it("keeps minimal pairs distinct — schon is not schön", () => {
    // schön folds to "schoen", so the umlaut-tolerance cannot collapse the two.
    expect(checkAnswer("schon", "schön")).toBe(false);
    expect(checkAnswer("schoen", "schön")).toBe(true);
    expect(checkAnswer("kann", "kenne")).toBe(false);
  });

  it("compares multi-word answers", () => {
    expect(checkAnswer("stehe auf", "stehe auf")).toBe(true);
    expect(checkAnswer("auf stehe", "stehe auf")).toBe(false);
  });
});

describe("checkAnyAnswer", () => {
  it("accepts any listed alternative", () => {
    expect(checkAnyAnswer("sie", ["wir", "sie"])).toBe(true);
  });

  it("rejects something not listed", () => {
    expect(checkAnyAnswer("ihr", ["wir", "sie"])).toBe(false);
  });
});
