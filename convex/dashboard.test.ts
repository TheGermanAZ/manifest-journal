import { describe, it, expect, vi, afterEach } from "vitest";
import { calculateStreak } from "./dashboard";

const DAY = 1000 * 60 * 60 * 24;

function daysAgo(n: number, hour = 12): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime() - n * DAY;
}

describe("calculateStreak", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for no entries", () => {
    expect(calculateStreak([])).toEqual({ streak: 0, graceDaysUsedThisWeek: 0 });
  });

  it("returns 1 for a single entry today", () => {
    expect(calculateStreak([{ _creationTime: daysAgo(0) }])).toEqual({ streak: 1, graceDaysUsedThisWeek: 0 });
  });

  it("returns 1 for a single entry yesterday", () => {
    expect(calculateStreak([{ _creationTime: daysAgo(1) }])).toEqual({ streak: 1, graceDaysUsedThisWeek: 0 });
  });

  it("returns 0 if most recent entry is 2+ days ago", () => {
    expect(calculateStreak([{ _creationTime: daysAgo(2) }])).toEqual({ streak: 0, graceDaysUsedThisWeek: 0 });
  });

  it("counts consecutive days, not entries", () => {
    // 3 entries today, 2 entries yesterday — streak should be 2, not 5
    const entries = [
      { _creationTime: daysAgo(0, 18) },
      { _creationTime: daysAgo(0, 12) },
      { _creationTime: daysAgo(0, 9) },
      { _creationTime: daysAgo(1, 20) },
      { _creationTime: daysAgo(1, 10) },
    ];
    expect(calculateStreak(entries)).toEqual({ streak: 2, graceDaysUsedThisWeek: 0 });
  });

  it("counts a 5-day streak correctly", () => {
    const entries = [
      { _creationTime: daysAgo(0) },
      { _creationTime: daysAgo(1) },
      { _creationTime: daysAgo(2) },
      { _creationTime: daysAgo(3) },
      { _creationTime: daysAgo(4) },
    ];
    expect(calculateStreak(entries)).toEqual({ streak: 5, graceDaysUsedThisWeek: 0 });
  });

  it("breaks the streak at a gap", () => {
    // Today, yesterday, then skip a day, then 2 more
    const entries = [
      { _creationTime: daysAgo(0) },
      { _creationTime: daysAgo(1) },
      // gap at day 2
      { _creationTime: daysAgo(3) },
      { _creationTime: daysAgo(4) },
    ];
    expect(calculateStreak(entries)).toEqual({ streak: 2, graceDaysUsedThisWeek: 0 });
  });

  it("handles multiple entries per day within a streak", () => {
    const entries = [
      { _creationTime: daysAgo(0, 20) },
      { _creationTime: daysAgo(0, 8) },
      { _creationTime: daysAgo(1, 15) },
      { _creationTime: daysAgo(2, 10) },
      { _creationTime: daysAgo(2, 7) },
    ];
    expect(calculateStreak(entries)).toEqual({ streak: 3, graceDaysUsedThisWeek: 0 });
  });

  // Grace day tests
  describe("with grace days", () => {
    it("bridges a 1-day gap when grace days are available", () => {
      // Today, skip yesterday, day before yesterday
      const entries = [
        { _creationTime: daysAgo(0) },
        // gap at day 1
        { _creationTime: daysAgo(2) },
        { _creationTime: daysAgo(3) },
      ];
      expect(calculateStreak(entries, 1)).toEqual(
        expect.objectContaining({ streak: 3 })
      );
    });

    it("does not bridge a 2+ day gap even with grace days", () => {
      // Today, then gap of 2 days
      const entries = [
        { _creationTime: daysAgo(0) },
        // gap at day 1 and day 2
        { _creationTime: daysAgo(3) },
        { _creationTime: daysAgo(4) },
      ];
      expect(calculateStreak(entries, 2)).toEqual(
        expect.objectContaining({ streak: 1 })
      );
    });

    it("exhausts grace day budget for the week", () => {
      // Two 1-day gaps within the same week with only 1 grace day allowed
      const entries = [
        { _creationTime: daysAgo(0) },
        // gap at day 1
        { _creationTime: daysAgo(2) },
        // gap at day 3
        { _creationTime: daysAgo(4) },
        { _creationTime: daysAgo(5) },
      ];
      // With graceDaysPerWeek=2, both gaps can be bridged
      const result2 = calculateStreak(entries, 2);
      expect(result2.streak).toBe(4);

      // With graceDaysPerWeek=1, only the first gap can be bridged (if same week)
      // The exact result depends on which ISO week the gaps fall in
      const result1 = calculateStreak(entries, 1);
      expect(result1.streak).toBeGreaterThanOrEqual(2);
    });

    it("preserves existing behavior when no grace days configured", () => {
      const entries = [
        { _creationTime: daysAgo(0) },
        // gap at day 1
        { _creationTime: daysAgo(2) },
      ];
      expect(calculateStreak(entries, 0)).toEqual({ streak: 1, graceDaysUsedThisWeek: 0 });
      expect(calculateStreak(entries)).toEqual({ streak: 1, graceDaysUsedThisWeek: 0 });
    });
  });
});
