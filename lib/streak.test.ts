import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";

const today = new Date(2026, 8, 13); // 13 Sep 2026, local

describe("computeStreak", () => {
  it("returns zero for a learner with no completed days", () => {
    expect(computeStreak([], today)).toEqual({ current: 0, longest: 0 });
  });

  it("counts a run ending today", () => {
    const r = computeStreak(["2026-09-11", "2026-09-12", "2026-09-13"], today);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it("keeps the streak alive when today is not finished yet", () => {
    // Yesterday done, today still in progress — the streak must not reset to 0.
    const r = computeStreak(["2026-09-11", "2026-09-12"], today);
    expect(r.current).toBe(2);
  });

  it("breaks the streak after a missed day", () => {
    const r = computeStreak(["2026-09-09", "2026-09-10"], today);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(2);
  });

  it("reports the longest historical run even when the current one is shorter", () => {
    const r = computeStreak(
      ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-13"],
      today,
    );
    expect(r.current).toBe(1);
    expect(r.longest).toBe(4);
  });

  it("does not double-count duplicate day keys", () => {
    const r = computeStreak(["2026-09-13", "2026-09-13", "2026-09-12"], today);
    expect(r.current).toBe(2);
  });

  it("counts a single day correctly", () => {
    expect(computeStreak(["2026-09-13"], today)).toEqual({ current: 1, longest: 1 });
  });
})
