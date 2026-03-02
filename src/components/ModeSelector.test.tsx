import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSelector } from "./ModeSelector";

describe("ModeSelector", () => {
  it("renders all three modes", () => {
    render(<ModeSelector selected="open" onSelect={() => {}} />);

    expect(screen.getByText("Open Canvas")).toBeDefined();
    expect(screen.getByText(/guided/i)).toBeDefined();
    expect(screen.getByText(/conversational/i)).toBeDefined();
  });

  it("calls onSelect with the mode string when clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<ModeSelector selected="open" onSelect={onSelect} />);

    await user.click(screen.getByText(/guided/i));
    expect(onSelect).toHaveBeenCalledWith("guided");

    await user.click(screen.getByText(/conversational/i));
    expect(onSelect).toHaveBeenCalledWith("conversational");
  });
});
