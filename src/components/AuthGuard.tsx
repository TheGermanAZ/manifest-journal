// src/components/AuthGuard.tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthSettled } from "../lib/useAuthSettled";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending } = useAuthSettled();
  const navigate = useNavigate();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasProvisioned = useRef(false);

  // Reset provisioning flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasProvisioned.current = false;
    }
  }, [isAuthenticated]);

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
  }, [isPending, isAuthenticated, navigate]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-base">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
