import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateMilestones, MilestoneEntry } from "./milestones";

/** Helper: create an entry with a date N days ago */
function entryDaysAgo(daysAgo: number, extra: Partial<MilestoneEntry> = {}): MilestoneEntry {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // noon to avoid DST edge cases
  d.setDate(d.getDate() - daysAgo);
  return { _creationTime: d.getTime(), ...extra };
}

describe("evaluateMilestones", () => {
  // Pin "today" so streak tests are deterministic
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 6, 12, 0, 0)); // March 6 2026, noon
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const noAchievements = new Set<string>();

  // --- Volume milestones ---

  it("awards first_entry for 1 entry", () => {
    const entries = [entryDaysAgo(0)];
    expect(evaluateMilestones(entries, noAchievements)).toContain("first_entry");
  });

  it("does not re-award first_entry if already achieved", () => {
    const entries = [entryDaysAgo(0)];
    const achieved = new Set(["first_entry"]);
    expect(evaluateMilestones(entries, achieved)).not.toContain("first_entry");
  });

  it("awards volume_50 at 50 entries", () => {
    const entries = Array.from({ length: 50 }, (_, i) => entryDaysAgo(i));
    expect(evaluateMilestones(entries, noAchievements)).toContain("volume_50");
  });

  it("does not award volume_50 at 49 entries", () => {
    const entries = Array.from({ length: 49 }, (_, i) => entryDaysAgo(i));
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("volume_50");
  });

  it("awards volume_100 at 100 entries", () => {
    const entries = Array.from({ length: 100 }, (_, i) => entryDaysAgo(i));
    expect(evaluateMilestones(entries, noAchievements)).toContain("volume_100");
  });

  // --- Word count milestones ---

  it("awards words_10k when total words reach 10000", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      entryDaysAgo(i, { wordCount: 1000 })
    );
    expect(evaluateMilestones(entries, noAchievements)).toContain("words_10k");
  });

  it("does not award words_10k below 10000", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      entryDaysAgo(i, { wordCount: 999 })
    );
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("words_10k");
  });

  it("handles entries with undefined wordCount", () => {
    const entries = [entryDaysAgo(0), entryDaysAgo(1, { wordCount: 10000 })];
    expect(evaluateMilestones(entries, noAchievements)).toContain("words_10k");
  });

  // --- Streak milestones ---

  it("awards streak_7 for 7 consecutive days", () => {
    // Entries ordered desc (most recent first) like Convex query
    const entries = Array.from({ length: 7 }, (_, i) => entryDaysAgo(i));
    expect(evaluateMilestones(entries, noAchievements)).toContain("streak_7");
  });

  it("does not award streak_7 for 6 consecutive days", () => {
    const entries = Array.from({ length: 6 }, (_, i) => entryDaysAgo(i));
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("streak_7");
  });

  it("breaks streak on a gap day", () => {
    // Days: 0, 1, 2, 4 (gap at day 3) — streak is only 3
    const entries = [entryDaysAgo(0), entryDaysAgo(1), entryDaysAgo(2), entryDaysAgo(4)];
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("streak_7");
  });

  it("awards streak_30 for 30 consecutive days", () => {
    const entries = Array.from({ length: 30 }, (_, i) => entryDaysAgo(i));
    expect(evaluateMilestones(entries, noAchievements)).toContain("streak_30");
  });

  it("no streak if most recent entry was 2+ days ago", () => {
    // All entries start from 2 days ago — gap from today breaks the streak
    const entries = Array.from({ length: 10 }, (_, i) => entryDaysAgo(i + 2));
    const result = evaluateMilestones(entries, noAchievements);
    expect(result).not.toContain("streak_7");
  });

  // --- Alignment sustained ---

  it("awards alignment_sustained for 5 consecutive high-alignment entries", () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entryDaysAgo(i, { analysis: { alignmentScore: 8 } })
    );
    expect(evaluateMilestones(entries, noAchievements)).toContain("alignment_sustained");
  });

  it("does not award alignment_sustained if interrupted by low score", () => {
    const entries = [
      entryDaysAgo(0, { analysis: { alignmentScore: 8 } }),
      entryDaysAgo(1, { analysis: { alignmentScore: 9 } }),
      entryDaysAgo(2, { analysis: { alignmentScore: 3 } }), // breaks the run
      entryDaysAgo(3, { analysis: { alignmentScore: 8 } }),
      entryDaysAgo(4, { analysis: { alignmentScore: 8 } }),
    ];
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("alignment_sustained");
  });

  it("does not count entries without analysis", () => {
    const entries = [
      entryDaysAgo(0, { analysis: { alignmentScore: 8 } }),
      entryDaysAgo(1), // no analysis
      entryDaysAgo(2, { analysis: { alignmentScore: 8 } }),
      entryDaysAgo(3, { analysis: { alignmentScore: 8 } }),
      entryDaysAgo(4, { analysis: { alignmentScore: 8 } }),
    ];
    // Only 4 analyzed entries with score >= 7, need 5 consecutive
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("alignment_sustained");
  });

  it("alignment_sustained threshold is >= 7", () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entryDaysAgo(i, { analysis: { alignmentScore: 7 } })
    );
    expect(evaluateMilestones(entries, noAchievements)).toContain("alignment_sustained");
  });

  it("alignment_sustained fails at score 6", () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entryDaysAgo(i, { analysis: { alignmentScore: 6 } })
    );
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("alignment_sustained");
  });

  // --- Emotional shift ---

  it("awards emotional_shift when recent positive follows negative", () => {
    const entries = [
      entryDaysAgo(0, { analysis: { alignmentScore: 5, emotionalTone: "hopeful" } }),
      entryDaysAgo(1, { analysis: { alignmentScore: 5, emotionalTone: "anxious" } }),
      entryDaysAgo(2, { analysis: { alignmentScore: 5, emotionalTone: "stuck" } }),
    ];
    expect(evaluateMilestones(entries, noAchievements)).toContain("emotional_shift");
  });

  it("does not award emotional_shift if most recent tone is negative", () => {
    const entries = [
      entryDaysAgo(0, { analysis: { alignmentScore: 5, emotionalTone: "anxious" } }),
      entryDaysAgo(1, { analysis: { alignmentScore: 5, emotionalTone: "hopeful" } }),
      entryDaysAgo(2, { analysis: { alignmentScore: 5, emotionalTone: "stuck" } }),
    ];
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("emotional_shift");
  });

  it("does not award emotional_shift with fewer than 3 entries", () => {
    const entries = [
      entryDaysAgo(0, { analysis: { alignmentScore: 5, emotionalTone: "hopeful" } }),
      entryDaysAgo(1, { analysis: { alignmentScore: 5, emotionalTone: "anxious" } }),
    ];
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("emotional_shift");
  });

  it("does not award emotional_shift if no negative tone in recent window", () => {
    const entries = [
      entryDaysAgo(0, { analysis: { alignmentScore: 5, emotionalTone: "hopeful" } }),
      entryDaysAgo(1, { analysis: { alignmentScore: 5, emotionalTone: "clear" } }),
      entryDaysAgo(2, { analysis: { alignmentScore: 5, emotionalTone: "expansive" } }),
    ];
    expect(evaluateMilestones(entries, noAchievements)).not.toContain("emotional_shift");
  });

  // --- Multiple milestones at once ---

  it("can award multiple milestones in a single call", () => {
    const entries = Array.from({ length: 50 }, (_, i) =>
      entryDaysAgo(i, { wordCount: 200, analysis: { alignmentScore: 8 } })
    );
    const result = evaluateMilestones(entries, noAchievements);
    expect(result).toContain("first_entry");
    expect(result).toContain("volume_50");
    expect(result).toContain("words_10k");
    expect(result).toContain("streak_7");
    expect(result).toContain("streak_30");
    expect(result).toContain("alignment_sustained");
  });

  // --- Empty state ---

  it("returns empty array for zero entries", () => {
    expect(evaluateMilestones([], noAchievements)).toEqual([]);
  });
});
