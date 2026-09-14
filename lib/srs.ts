/**
 * Spaced repetition. Three mastery states, one interval each:
 *   KNOWN   -> 7 days
 *   SHAKY   -> 2 days
 *   UNKNOWN -> 1 day
 *
 * This module is the only place those intervals are defined.
 */

export type MasteryStateName = "KNOWN" | "SHAKY" | "UNKNOWN";

export const REVIEW_INTERVAL_DAYS: Record<MasteryStateName, number> = {
  KNOWN: 7,
  SHAKY: 2,
  UNKNOWN: 1,
};

export const MASTERY_STATES: MasteryStateName[] = ["UNKNOWN", "SHAKY", "KNOWN"];

export const DAY_MS = 24 * 60 * 60 * 1000;

/** When a card graded `state` should next come up for review. */
export function nextDue(state: MasteryStateName, now: Date = new Date()): Date {
  return new Date(now.getTime() + REVIEW_INTERVAL_DAYS[state] * DAY_MS);
}

/** A card is a lapse when it falls back from KNOWN to something weaker. */
export function isLapse(from: MasteryStateName | null, to: MasteryStateName): boolean {
  return from === "KNOWN" && to !== "KNOWN";
}

export type GradeResult = {
  state: MasteryStateName;
  dueAt: Date;
  lastReviewedAt: Date;
  reviewCountDelta: number;
  lapseDelta: number;
};

/** Apply a grade to a card, returning the fields to persist. */
export function gradeCard(
  from: MasteryStateName | null,
  to: MasteryStateName,
  now: Date = new Date(),
): GradeResult {
  return {
    state: to,
    dueAt: nextDue(to, now),
    lastReviewedAt: now,
    reviewCountDelta: 1,
    lapseDelta: isLapse(from, to) ? 1 : 0,
  };
}

/** Cards due now come first; unseen words backfill up to the session size. */
export function buildQueue<T extends { dueAt: Date }, U>(
  dueCards: T[],
  unseen: U[],
  opts: { sessionSize: number; maxNew: number; now?: Date },
): { due: T[]; fresh: U[] } {
  const now = opts.now ?? new Date();
  const due = dueCards.filter((c) => c.dueAt.getTime() <= now.getTime());
  const room = Math.max(0, opts.sessionSize - due.length);
  const fresh = unseen.slice(0, Math.min(room, opts.maxNew));
  return { due: due.slice(0, opts.sessionSize), fresh };
}
