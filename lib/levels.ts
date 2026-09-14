export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type LevelName = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<LevelName, string> = {
  A1: "A1 · Beginner",
  A2: "A2 · Elementary",
  B1: "B1 · Intermediate",
  B2: "B2 · Upper intermediate",
};

export function isLevel(value: unknown): value is LevelName {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

/** The next level up, or null at B2 (the goal). */
export function nextLevel(level: LevelName): LevelName | null {
  const i = LEVELS.indexOf(level);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}

/** Every level at or below the given one — what a learner has "unlocked". */
export function levelsUpTo(level: LevelName): LevelName[] {
  return LEVELS.slice(0, LEVELS.indexOf(level) + 1);
}
