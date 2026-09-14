/**
 * Answer checking for typed exercises.
 *
 * Learners frequently type on keyboards with no umlauts, so "aelter" is
 * accepted for "älter". Everything else is compared strictly (after trimming
 * and case-folding) — we do not want to award credit for a wrong ending.
 */

import { normalize } from "./search";

/** Strips only the surrounding punctuation a learner might add. */
function tidy(input: string): string {
  return input.trim().replace(/^[„"'»«]+|[".!?…"'»«]+$/g, "").trim();
}

export function checkAnswer(given: string, expected: string): boolean {
  const g = tidy(given);
  const e = tidy(expected);
  if (!g) return false;

  if (g.toLocaleLowerCase("de") === e.toLocaleLowerCase("de")) return true;

  // Fall back to the umlaut-folded comparison for keyboard-limited input.
  return normalize(g) === normalize(e) && normalize(e).length > 0;
}

/** Accepts any one of several correct answers, e.g. "wir"/"sie" forms. */
export function checkAnyAnswer(given: string, expected: string[]): boolean {
  return expected.some((e) => checkAnswer(given, e));
}
