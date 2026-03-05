import { useState, useEffect } from "react";
import { authClient } from "./auth-client";

const AUTH_CALLBACK_PARAMS = [
  "authCallback",
  "ott",
  "code",
  "state",
  "error",
  "error_description",
  "error_uri",
] as const;

function hasAuthCallbackParams() {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  return AUTH_CALLBACK_PARAMS.some((param) => search.has(param));
}

function clearAuthCallbackParams(url: URL) {
  for (const param of AUTH_CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }
}

/**
 * Wraps authClient.useSession() to handle OAuth callback handoff timing.
 *
 * We keep auth state as pending while we are returning from social login so
 * we don't briefly render public unauthenticated routes (like the landing page).
 */
export function useAuthSettled() {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [authRedirectPending, setAuthRedirectPending] = useState(
    hasAuthCallbackParams,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authRedirectPending) {
      return;
    }

    const url = new URL(window.location.href);
    const hasError =
      url.searchParams.has("error") ||
      url.searchParams.has("error_description") ||
      url.searchParams.has("error_uri");

    if (!session && !hasError) {
      return;
    }

    clearAuthCallbackParams(url);
    window.history.replaceState({}, "", url.toString());
    setAuthRedirectPending(false);
  }, [authRedirectPending, session]);

  return {
    session,
    isAuthenticated: !!session,
    isPending: !mounted || isPending || authRedirectPending,
  };
}
