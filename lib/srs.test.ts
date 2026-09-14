import { describe, expect, it } from "vitest";
import { DAY_MS, buildQueue, gradeCard, isLapse, nextDue } from "./srs";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("nextDue", () => {
  it("schedules KNOWN 7 days out", () => {
    expect(nextDue("KNOWN", now).getTime()).toBe(now.getTime() + 7 * DAY_MS);
  });

  it("schedules SHAKY 2 days out", () => {
    expect(nextDue("SHAKY", now).getTime()).toBe(now.getTime() + 2 * DAY_MS);
  });

  it("schedules UNKNOWN 1 day out", () => {
    expect(nextDue("UNKNOWN", now).getTime()).toBe(now.getTime() + 1 * DAY_MS);
  });

  it("is independent of local timezone offsets", () => {
    // A fixed millisecond offset must not drift across a DST boundary.
    const beforeDst = new Date("2026-10-24T23:30:00.000Z");
    expect(nextDue("KNOWN", beforeDst).getTime() - beforeDst.getTime()).toBe(7 * DAY_MS);
  });
});

describe("isLapse", () => {
  it("counts KNOWN -> UNKNOWN as a lapse", () => {
    expect(isLapse("KNOWN", "UNKNOWN")).toBe(true);
  });
  it("counts KNOWN -> SHAKY as a lapse", () => {
    expect(isLapse("KNOWN", "SHAKY")).toBe(true);
  });
  it("does not count KNOWN -> KNOWN as a lapse", () => {
    expect(isLapse("KNOWN", "KNOWN")).toBe(false);
  });
  it("does not count a first-ever review as a lapse", () => {
    expect(isLapse(null, "UNKNOWN")).toBe(false);
  });
  it("does not count SHAKY -> UNKNOWN as a lapse", () => {
    expect(isLapse("SHAKY", "UNKNOWN")).toBe(false);
  });
});

describe("gradeCard", () => {
  it("returns the interval matching the new state", () => {
    const r = gradeCard("UNKNOWN", "KNOWN", now);
    expect(r.state).toBe("KNOWN");
    expect(r.dueAt.getTime()).toBe(now.getTime() + 7 * DAY_MS);
    expect(r.reviewCountDelta).toBe(1);
    expect(r.lapseDelta).toBe(0);
  });

  it("records a lapse when falling back from KNOWN", () => {
    expect(gradeCard("KNOWN", "SHAKY", now).lapseDelta).toBe(1);
  });
});

describe("buildQueue", () => {
  const card = (offsetDays: number) => ({ dueAt: new Date(now.getTime() + offsetDays * DAY_MS) });

  it("excludes cards that are not due yet", () => {
    const { due } = buildQueue([card(-1), card(3)], [], { sessionSize: 20, maxNew: 10, now });
    expect(due).toHaveLength(1);
  });

  it("backfills with unseen words when there is room", () => {
    const { due, fresh } = buildQueue([card(-1)], [1, 2, 3, 4], {
      sessionSize: 3,
      maxNew: 10,
      now,
    });
    expect(due).toHaveLength(1);
    expect(fresh).toEqual([1, 2]);
  });

  it("respects the new-card cap even with lots of room", () => {
    const { fresh } = buildQueue([], [1, 2, 3, 4, 5], { sessionSize: 20, maxNew: 2, now });
    expect(fresh).toEqual([1, 2]);
  });

  it("adds no new cards when due cards already fill the session", () => {
    const { fresh } = buildQueue([card(-1), card(-2)], [1, 2, 3], {
      sessionSize: 2,
      maxNew: 10,
      now,
    });
    expect(fresh).toEqual([]);
  });
});
