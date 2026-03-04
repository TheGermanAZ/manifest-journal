import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPage } from "./LandingPage";

// Mock TanStack Router's Link as a plain anchor
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

describe("LandingPage", () => {
  it("renders the hero headline", () => {
    render(<LandingPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/Your dream life starts/);
    expect(h1).toHaveTextContent(/with today's entry/);

  });

  it("renders the kicker text", () => {
    render(<LandingPage />);
    expect(screen.getByText("Manifest Journal")).toBeInTheDocument();
  });

  it("renders all three feature cards", () => {
    render(<LandingPage />);
    expect(screen.getByText("Define Your Dream")).toBeInTheDocument();
    expect(screen.getByText("Journal Your Way")).toBeInTheDocument();
    expect(screen.getByText("Watch Your Momentum")).toBeInTheDocument();
  });

  it("renders feature descriptions", () => {
    render(<LandingPage />);
    expect(screen.getByText(/five life dimensions/i)).toBeInTheDocument();
    expect(screen.getByText(/three modes that meet you/i)).toBeInTheDocument();
    expect(screen.getByText(/emotional patterns/i)).toBeInTheDocument();
  });

  it("has CTA links pointing to register", () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByRole("link", { name: /start journaling/i });
    expect(ctaLinks).toHaveLength(2); // hero + closing
    ctaLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/register");
    });
  });

  it("has a sign-in link pointing to login", () => {
    render(<LandingPage />);
    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(signIn).toHaveAttribute("href", "/login");
  });

  it("renders the closing section copy", () => {
    render(<LandingPage />);
    expect(screen.getByText("Five minutes a day.")).toBeInTheDocument();
  });
});
