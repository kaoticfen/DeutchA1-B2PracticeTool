/**
 * Level progression.
 *
 * A placement test sets the starting level. From there a learner auto-promotes
 * when they have genuinely mastered the current level:
 *   - at least VOCAB_THRESHOLD of that level's words are in the KNOWN state, and
 *   - at least ACCURACY_THRESHOLD rolling accuracy on that level's exercises,
 *     over at least MIN_ATTEMPTS attempts (so three lucky answers can't promote).
 *
 * Users on levelMode = MANUAL are never auto-promoted.
 */

import { LEVELS, type LevelName, nextLevel } from "./levels";

export const VOCAB_THRESHOLD = 0.8;
export const ACCURACY_THRESHOLD = 0.8;
export const MIN_ATTEMPTS = 20;

export type LevelModeName = "AUTO" | "MANUAL";

export type MasteryInput = {
  knownWords: number;
  totalWords: number;
  correctAttempts: number;
  totalAttempts: number;
};

export type MasteryProgress = {
  vocabRatio: number;
  accuracyRatio: number;
  attempts: number;
  vocabMet: boolean;
  accuracyMet: boolean;
  attemptsMet: boolean;
  /** 0..1 across all gates — what the profile progress ring renders. */
  overall: number;
  eligible: boolean;
};

const safeRatio = (num: number, den: number) => (den > 0 ? num / den : 0);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function computeMastery(input: MasteryInput): MasteryProgress {
  const vocabRatio = safeRatio(input.knownWords, input.totalWords);
  const accuracyRatio = safeRatio(input.correctAttempts, input.totalAttempts);

  const vocabMet = input.totalWords > 0 && vocabRatio >= VOCAB_THRESHOLD;
  const accuracyMet = accuracyRatio >= ACCURACY_THRESHOLD;
  const attemptsMet = input.totalAttempts >= MIN_ATTEMPTS;

  // Each gate contributes its own progress toward 100%.
  const overall = clamp01(
    (clamp01(vocabRatio / VOCAB_THRESHOLD) +
      clamp01(accuracyRatio / ACCURACY_THRESHOLD) +
      clamp01(input.totalAttempts / MIN_ATTEMPTS)) /
      3,
  );

  return {
    vocabRatio,
    accuracyRatio,
    attempts: input.totalAttempts,
    vocabMet,
    accuracyMet,
    attemptsMet,
    overall,
    eligible: vocabMet && accuracyMet && attemptsMet,
  };
}

export type PromotionDecision = {
  promoted: boolean;
  from: LevelName;
  to: LevelName;
  progress: MasteryProgress;
  reason: "promoted" | "manual-mode" | "at-max-level" | "not-yet";
};

export function evaluatePromotion(
  currentLevel: LevelName,
  mode: LevelModeName,
  input: MasteryInput,
): PromotionDecision {
  const progress = computeMastery(input);
  const base = { promoted: false, from: currentLevel, to: currentLevel, progress };

  if (mode === "MANUAL") return { ...base, reason: "manual-mode" };

  const up = nextLevel(currentLevel);
  if (!up) return { ...base, reason: "at-max-level" };
  if (!progress.eligible) return { ...base, reason: "not-yet" };

  return { promoted: true, from: currentLevel, to: up, progress, reason: "promoted" };
}

/**
 * Score a placement test into a starting level: the highest level where the
 * learner cleared the accuracy bar, defaulting to A1.
 */
export function scorePlacement(perLevel: Record<LevelName, { correct: number; total: number }>): LevelName {
  let best: LevelName = "A1";
  for (const level of LEVELS) {
    const r = perLevel[level];
    if (r && r.total > 0 && r.correct / r.total >= ACCURACY_THRESHOLD) best = level;
  }
  return best;
}
