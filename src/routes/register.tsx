import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthForm } from "../components/AuthForm";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      await signIn("password", { email, password, flow: "signUp" });
    } catch {
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
            Create your account
          </p>
        </div>
        <AuthForm mode="register" onSubmit={handleSubmit} isLoading={isLoading} />
        <p className="text-sm text-stone-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-stone-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
