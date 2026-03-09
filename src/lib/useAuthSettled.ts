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

const SESSION_STORAGE_KEY = "better-auth_session_data";
const COOKIE_STORAGE_KEY = "better-auth_cookie";
const AUTH_PENDING_TIMEOUT_MS = 3_000;
const AUTH_CALLBACK_TIMEOUT_MS = 8_000;

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

function readCachedSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clearCachedSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(COOKIE_STORAGE_KEY);
}

/**
 * Wraps authClient.useSession() to handle OAuth callback handoff timing.
 *
 * We keep auth state as pending while we are returning from social login so
 * we don't briefly render public unauthenticated routes (like the landing page).
 */
export function useAuthSettled() {
  const { data: session, isPending } = authClient.useSession();
  const [authRedirectPending, setAuthRedirectPending] = useState(
    hasAuthCallbackParams,
  );
  const [cachedSession, setCachedSession] = useState(readCachedSession);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [callbackTimedOut, setCallbackTimedOut] = useState(false);

  useEffect(() => {
    setCachedSession(readCachedSession());
  }, []);

  useEffect(() => {
    if (!isPending) {
      setSessionTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setSessionTimedOut(true);
      clearCachedSession();
      setCachedSession(null);
    }, AUTH_PENDING_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [isPending]);

  useEffect(() => {
    if (!authRedirectPending) {
      setCallbackTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      clearAuthCallbackParams(url);
      window.history.replaceState({}, "", url.toString());
      setCallbackTimedOut(true);
      setAuthRedirectPending(false);
      setCachedSession(readCachedSession());
    }, AUTH_CALLBACK_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [authRedirectPending]);

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
    setCallbackTimedOut(false);
  }, [authRedirectPending, session]);

  useEffect(() => {
    if (isPending || session !== null) {
      return;
    }

    clearCachedSession();
    setCachedSession(null);
  }, [isPending, session]);

  const resolvedSession = session ?? cachedSession;
  const resolvedPending =
    ((!!resolvedSession || authRedirectPending) &&
      isPending &&
      !sessionTimedOut) ||
    (authRedirectPending && !callbackTimedOut);

  return {
    session: resolvedSession,
    isAuthenticated: !!resolvedSession,
    isPending: resolvedPending,
  };
}
