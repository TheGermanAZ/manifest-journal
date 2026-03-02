import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AlignmentDial } from "./AlignmentDial";

describe("AlignmentDial", () => {
  it("renders the score number", () => {
    render(<AlignmentDial score={7} rationale="Good alignment" />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the rationale text", () => {
    render(
      <AlignmentDial score={5} rationale="You're on the right track" />,
    );
    expect(screen.getByText("You're on the right track")).toBeInTheDocument();
  });

  it('renders "out of 10" label', () => {
    render(<AlignmentDial score={9} rationale="Excellent alignment" />);
    expect(screen.getByText("out of 10")).toBeInTheDocument();
  });
});
