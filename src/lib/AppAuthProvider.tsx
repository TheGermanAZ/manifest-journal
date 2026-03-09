import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthSettled } from "./useAuthSettled";

type AppAuthState = {
  isAuthenticated: boolean;
  isPending: boolean;
};

const AppAuthContext = createContext<AppAuthState | null>(null);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isPending } = useAuthSettled();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasProvisioned = useRef(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasProvisioned.current = false;
      setIsProvisioning(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isPending || hasProvisioned.current || isProvisioning) {
      return;
    }

    let cancelled = false;
    hasProvisioned.current = true;
    setIsProvisioning(true);

    ensureUser()
      .catch((err) => {
        console.error("Failed to ensure user:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setIsProvisioning(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ensureUser, isAuthenticated, isPending, isProvisioning]);

  return (
    <AppAuthContext.Provider
      value={{
        isAuthenticated,
        isPending: isAuthenticated && (isPending || isProvisioning),
      }}
    >
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const value = useContext(AppAuthContext);
  if (!value) {
    throw new Error("useAppAuth must be used within AppAuthProvider");
  }
  return value;
}
