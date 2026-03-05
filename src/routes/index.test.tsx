import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Route } from "./index";

vi.mock("../lib/useAuthSettled", () => ({
  useAuthSettled: vi.fn(),
}));
vi.mock("../components/LandingPage", () => ({
  LandingPage: () => (
    <main>
      <h1>Your dream life starts</h1>
    </main>
  ),
}));

import { useAuthSettled } from "../lib/useAuthSettled";

const IndexPage = Route.options.component as () => JSX.Element;

describe("index route auth state handling", () => {
  beforeEach(() => {
    vi.mocked(useAuthSettled).mockReset();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders loading instead of landing during auth callback handoff", async () => {
    window.history.replaceState({}, "", "/?authCallback=1");
    vi.mocked(useAuthSettled).mockReturnValue({
      session: null,
      isAuthenticated: false,
      isPending: true,
    });

    render(<IndexPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?authCallback=1");
  });

  it("renders landing when unauthenticated and no callback flow", async () => {
    vi.mocked(useAuthSettled).mockReturnValue({
      session: null,
      isAuthenticated: false,
      isPending: false,
    });

    render(<IndexPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Your dream life starts/i }),
      ).toBeInTheDocument();
    });
  });
});
