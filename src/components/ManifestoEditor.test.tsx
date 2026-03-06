import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ManifestoEditor } from "./ManifestoEditor";

describe("ManifestoEditor", () => {
  it("renders textarea with placeholder", () => {
    render(<ManifestoEditor value="" onChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText(/five pillars/i),
    ).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const onChange = vi.fn();
    render(<ManifestoEditor value="" onChange={onChange} />);
    await userEvent.type(
      screen.getByPlaceholderText(/five pillars/i),
      "a",
    );
    expect(onChange).toHaveBeenCalled();
  });

  it("shows word count when non-empty", () => {
    render(<ManifestoEditor value="hello world" onChange={vi.fn()} />);
    expect(screen.getByText(/2 words/)).toBeInTheDocument();
  });

  it("hides word count when empty", () => {
    render(<ManifestoEditor value="" onChange={vi.fn()} />);
    expect(screen.queryByText(/words/)).not.toBeInTheDocument();
  });
});
