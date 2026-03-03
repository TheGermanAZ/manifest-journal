// src/components/AuthGuard.tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../lib/auth-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasProvisioned = useRef(false);

  const isAuthenticated = !!session;

  // Provision app user on first authenticated load (once only)
  useEffect(() => {
    if (isAuthenticated && !hasProvisioned.current) {
      hasProvisioned.current = true;
      ensureUser().catch((err) =>
        console.error("Failed to ensure user:", err)
      );
    }
  }, [isAuthenticated, ensureUser]);

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isPending, navigate]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
