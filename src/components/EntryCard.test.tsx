import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EntryCard } from "./EntryCard";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

const mockEntry = {
  _id: "entry1" as any,
  content: "Today I felt hopeful about my career.",
  mode: "open" as const,
  _creationTime: Date.now(),
  analysis: {
    alignmentScore: 8,
    emotionalTone: "hopeful" as const,
    patternInsight: "You focus on growth.",
    nudge: "What would you do with no fear?",
    alignmentRationale: "Very aligned.",
  },
};

describe("EntryCard", () => {
  it("shows entry content preview", () => {
    render(<EntryCard entry={mockEntry} onClick={() => {}} />);
    expect(
      screen.getByText("Today I felt hopeful about my career."),
    ).toBeDefined();
  });

  it("shows alignment score", () => {
    render(<EntryCard entry={mockEntry} onClick={() => {}} />);
    expect(screen.getByText("8/10")).toBeDefined();
  });

  it("shows emotional tone badge", () => {
    render(<EntryCard entry={mockEntry} onClick={() => {}} />);
    expect(screen.getByText("hopeful")).toBeDefined();
  });
});
