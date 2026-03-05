import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuthSettled } from "./useAuthSettled";

vi.mock("./auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

import { authClient } from "./auth-client";

function AuthSettledProbe() {
  const { isPending, isAuthenticated } = useAuthSettled();
  return (
    <div>
      <span data-testid="pending">{String(isPending)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
    </div>
  );
}

function mockSessionState(state: { data: any; isPending: boolean }) {
  (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(state);
}

describe("useAuthSettled", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("keeps auth pending while callback params are present", () => {
    window.history.replaceState({}, "", "/?authCallback=1");
    mockSessionState({ data: null, isPending: false });

    render(<AuthSettledProbe />);

    expect(screen.getByTestId("pending")).toHaveTextContent("true");
    expect(window.location.search).toContain("authCallback=1");
    expect(screen.getByTestId("authed")).toHaveTextContent("false");
  });

  it("drops callback params and settles when a session appears", async () => {
    window.history.replaceState({}, "", "/?authCallback=1");
    mockSessionState({ data: { user: { id: "u1" } }, isPending: false });

    render(<AuthSettledProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("pending")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("authed")).toHaveTextContent("true");
    expect(window.location.search).toBe("");
  });
});
