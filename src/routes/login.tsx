import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      await signIn("resend", formData);
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Manifest Journal
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Sign in to continue
          </p>
        </div>
        {sent ? (
          <div className="text-center">
            <p className="text-sm text-stone-700">
              Check your email for a sign-in link.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Sent to {email}
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-stone-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-stone-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send magic link"}
              </button>
            </form>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
            <button
              onClick={() => void signIn("discord")}
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Continue with Discord
            </button>
          </>
        )}
      </div>
    </main>
  );
}
