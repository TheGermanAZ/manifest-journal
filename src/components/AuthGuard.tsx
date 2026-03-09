// src/components/AuthGuard.tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppAuth } from "../lib/AppAuthProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending } = useAppAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isPending, isAuthenticated, navigate]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
