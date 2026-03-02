import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AuthForm } from "./AuthForm";

describe("AuthForm", () => {
  it("renders email and password fields", () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("calls onSubmit with email and password", async () => {
    const onSubmit = vi.fn();
    render(<AuthForm mode="login" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email/i), "test@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password123",
    });
  });

  it("shows 'Create account' button in register mode", () => {
    render(<AuthForm mode="register" onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });
});
