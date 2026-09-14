import { describe, expect, it } from "vitest";
import { deriveForms, deriveTranslations } from "./forms";
import type { SeedWord } from "./seed-schema";

const essen: SeedWord = {
  lemma: "essen",
  level: "A1",
  pos: "VERB",
  subcategory: "verb-irregular",
  translationsEn: ["to eat"],
  verb: {
    isSeparable: false,
    isIrregular: true,
    auxiliary: "haben",
    praesens: { ich: "esse", du: "isst", er: "isst", wir: "essen", ihr: "esst", sie: "essen" },
    praeteritum: "aß",
    partizip2: "gegessen",
  },
};

const aufstehen: SeedWord = {
  lemma: "aufstehen",
  level: "A2",
  pos: "VERB",
  subcategory: "verb-separable",
  translationsEn: ["to get up"],
  verb: {
    isSeparable: true,
    prefix: "auf",
    isIrregular: true,
    auxiliary: "sein",
    praesens: {
      ich: "stehe auf",
      du: "stehst auf",
      er: "steht auf",
      wir: "stehen auf",
      ihr: "steht auf",
      sie: "stehen auf",
    },
    praeteritum: "stand auf",
    partizip2: "aufgestanden",
  },
};

const haus: SeedWord = {
  lemma: "Haus",
  level: "A1",
  pos: "NOUN",
  subcategory: "noun-das",
  translationsEn: ["house"],
  noun: { article: "das", plural: "Häuser" },
};

const schnell: SeedWord = {
  lemma: "schnell",
  level: "A1",
  pos: "ADJ",
  subcategory: "adj-common",
  translationsEn: ["fast", "quick"],
  adjective: { comparative: "schneller", superlative: "am schnellsten" },
};

const search = (w: SeedWord) => deriveForms(w).map((f) => f.searchForm);

describe("deriveForms", () => {
  it("indexes a conjugated form so 'isst' resolves to essen", () => {
    expect(search(essen)).toContain("isst");
  });

  it("indexes the lemma itself", () => {
    expect(search(essen)).toContain("essen");
  });

  it("indexes past forms", () => {
    const forms = search(essen);
    expect(forms).toContain("ass"); // aß folds to ass
    expect(forms).toContain("gegessen");
  });

  it("indexes an umlauted plural under its folded form", () => {
    expect(search(haus)).toContain("haeuser");
  });

  it("indexes a noun with its article", () => {
    expect(search(haus)).toContain("das haus");
  });

  it("indexes the bare stem of a separable verb", () => {
    const forms = search(aufstehen);
    expect(forms).toContain("stehe auf");
    expect(forms).toContain("stehe");
  });

  it("indexes adjective comparison forms", () => {
    const forms = search(schnell);
    expect(forms).toContain("schneller");
    expect(forms).toContain("am schnellsten");
  });

  it("deduplicates identical surface forms of the same type", () => {
    const forms = deriveForms(essen);
    const keys = forms.map((f) => `${f.searchForm}::${f.formType}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps wir and sie separately even though they look identical", () => {
    const types = deriveForms(essen).map((f) => f.formType);
    expect(types).toContain("praesens-wir");
    expect(types).toContain("praesens-sie");
  });
});

describe("deriveTranslations", () => {
  it("indexes both 'to eat' and 'eat'", () => {
    const t = deriveTranslations(essen).map((x) => x.searchText);
    expect(t).toContain("to eat");
    expect(t).toContain("eat");
  });

  it("keeps the original gloss text for display", () => {
    expect(deriveTranslations(essen).every((t) => t.text === "to eat")).toBe(true);
  });

  it("indexes every gloss of a multi-sense word", () => {
    const t = deriveTranslations(schnell).map((x) => x.searchText);
    expect(t).toContain("fast");
    expect(t).toContain("quick");
  });
});
