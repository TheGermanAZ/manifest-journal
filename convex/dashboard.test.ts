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
    expect(calculateStreak([])).toBe(0);
  });

  it("returns 1 for a single entry today", () => {
    expect(calculateStreak([{ _creationTime: daysAgo(0) }])).toBe(1);
  });

  it("returns 1 for a single entry yesterday", () => {
    expect(calculateStreak([{ _creationTime: daysAgo(1) }])).toBe(1);
  });

  it("returns 0 if most recent entry is 2+ days ago", () => {
    expect(calculateStreak([{ _creationTime: daysAgo(2) }])).toBe(0);
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
    expect(calculateStreak(entries)).toBe(2);
  });

  it("counts a 5-day streak correctly", () => {
    const entries = [
      { _creationTime: daysAgo(0) },
      { _creationTime: daysAgo(1) },
      { _creationTime: daysAgo(2) },
      { _creationTime: daysAgo(3) },
      { _creationTime: daysAgo(4) },
    ];
    expect(calculateStreak(entries)).toBe(5);
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
    expect(calculateStreak(entries)).toBe(2);
  });

  it("handles multiple entries per day within a streak", () => {
    const entries = [
      { _creationTime: daysAgo(0, 20) },
      { _creationTime: daysAgo(0, 8) },
      { _creationTime: daysAgo(1, 15) },
      { _creationTime: daysAgo(2, 10) },
      { _creationTime: daysAgo(2, 7) },
    ];
    expect(calculateStreak(entries)).toBe(3);
  });
});
