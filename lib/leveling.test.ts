import { describe, expect, it } from "vitest";
import { computeMastery, evaluatePromotion, scorePlacement } from "./leveling";

const mastered = { knownWords: 80, totalWords: 100, correctAttempts: 40, totalAttempts: 50 };

describe("computeMastery", () => {
  it("marks all gates met at exactly the thresholds", () => {
    const p = computeMastery({ knownWords: 80, totalWords: 100, correctAttempts: 16, totalAttempts: 20 });
    expect(p.vocabMet).toBe(true);
    expect(p.accuracyMet).toBe(true);
    expect(p.attemptsMet).toBe(true);
    expect(p.eligible).toBe(true);
  });

  it("is not eligible below the attempt floor even at perfect accuracy", () => {
    const p = computeMastery({ knownWords: 100, totalWords: 100, correctAttempts: 3, totalAttempts: 3 });
    expect(p.accuracyRatio).toBe(1);
    expect(p.attemptsMet).toBe(false);
    expect(p.eligible).toBe(false);
  });

  it("does not divide by zero on an empty level", () => {
    const p = computeMastery({ knownWords: 0, totalWords: 0, correctAttempts: 0, totalAttempts: 0 });
    expect(p.vocabRatio).toBe(0);
    expect(p.accuracyRatio).toBe(0);
    expect(p.eligible).toBe(false);
  });

  it("keeps overall progress within 0..1 when gates are overshot", () => {
    const p = computeMastery({ knownWords: 100, totalWords: 100, correctAttempts: 500, totalAttempts: 500 });
    expect(p.overall).toBe(1);
  });
});

describe("evaluatePromotion", () => {
  it("promotes an eligible AUTO learner to the next level", () => {
    const d = evaluatePromotion("A1", "AUTO", mastered);
    expect(d.promoted).toBe(true);
    expect(d.to).toBe("A2");
    expect(d.reason).toBe("promoted");
  });

  it("never promotes in MANUAL mode, even when eligible", () => {
    const d = evaluatePromotion("A1", "MANUAL", mastered);
    expect(d.promoted).toBe(false);
    expect(d.reason).toBe("manual-mode");
    expect(d.to).toBe("A1");
  });

  it("stops at B2, the goal level", () => {
    const d = evaluatePromotion("B2", "AUTO", mastered);
    expect(d.promoted).toBe(false);
    expect(d.reason).toBe("at-max-level");
  });

  it("holds an under-performing learner at their level", () => {
    const d = evaluatePromotion("A2", "AUTO", {
      knownWords: 10,
      totalWords: 100,
      correctAttempts: 40,
      totalAttempts: 50,
    });
    expect(d.promoted).toBe(false);
    expect(d.reason).toBe("not-yet");
  });
});

describe("scorePlacement", () => {
  it("defaults to A1 when nothing is cleared", () => {
    expect(
      scorePlacement({
        A1: { correct: 0, total: 5 },
        A2: { correct: 0, total: 5 },
        B1: { correct: 0, total: 5 },
        B2: { correct: 0, total: 5 },
      }),
    ).toBe("A1");
  });

  it("returns the highest cleared level", () => {
    expect(
      scorePlacement({
        A1: { correct: 5, total: 5 },
        A2: { correct: 5, total: 5 },
        B1: { correct: 2, total: 5 },
        B2: { correct: 0, total: 5 },
      }),
    ).toBe("A2");
  });

  it("ignores levels with no questions asked", () => {
    expect(
      scorePlacement({
        A1: { correct: 5, total: 5 },
        A2: { correct: 0, total: 0 },
        B1: { correct: 0, total: 0 },
        B2: { correct: 0, total: 0 },
      }),
    ).toBe("A1");
  });
});
