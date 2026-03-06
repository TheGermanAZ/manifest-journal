// src/routes/register.tsx
import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { useAuthSettled } from "../lib/useAuthSettled";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { isAuthenticated, isPending } = useAuthSettled();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-base">Loading...</div>
      </main>
    );
  }

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authClient.signIn.magicLink({ email, callbackURL: window.location.origin + "/" });
      setSent(true);
    } catch (err) {
      console.error("Magic link sign-in failed:", err);
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscord = async () => {
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: window.location.origin + "/?authCallback=1",
        errorCallbackURL: window.location.origin + "/register",
      });
    } catch (err) {
      console.error("Discord sign-in failed:", err);
      setError(err instanceof Error ? err.message : "Discord sign-in failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="display-title text-[clamp(1.8rem,4vw,2.4rem)] font-normal tracking-tight text-[var(--ink)]">
            Create your account
          </h1>
          <p className="mt-2 text-base text-[var(--ink-light)]">
            Begin your journaling practice
          </p>
        </div>
        {error && (
          <div className="w-full rounded bg-red-50 border border-red-200 px-4 py-3 text-base text-red-700">
            {error}
          </div>
        )}
        {sent ? (
          <div className="text-center">
            <p className="text-base text-[var(--ink)]">
              Check your email for a sign-in link.
            </p>
            <p className="mt-1 text-sm text-[var(--ink-light)]">
              Sent to {email}
            </p>
          </div>
        ) : (
          <>
            {/* Email magic link sign-up temporarily disabled
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium tracking-wide uppercase text-[var(--ink-light)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-[rgba(26,26,26,0.15)] bg-transparent px-3 py-2.5 text-base text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="ink-cta py-2.5 text-center disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send magic link"}
              </button>
            </form>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="h-px flex-1 bg-[rgba(26,26,26,0.1)]" />
              <span className="text-sm text-[var(--ink-light)] tracking-wide">or</span>
              <div className="h-px flex-1 bg-[rgba(26,26,26,0.1)]" />
            </div>
            */}
            <button
              type="button"
              onClick={handleDiscord}
              className="flex w-full max-w-sm items-center justify-center gap-2 border border-[rgba(26,26,26,0.15)] bg-transparent py-2.5 text-base font-medium tracking-wide text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Continue with Discord
            </button>
            <p className="text-base text-[var(--ink-light)]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[var(--ink)] underline underline-offset-[3px] decoration-[rgba(26,26,26,0.3)] hover:text-[var(--vermillion)]"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
