import { useState, useEffect } from "react";
import { authClient } from "./auth-client";

/**
 * Wraps authClient.useSession() to handle the cross-domain OAuth
 * token exchange race condition.
 *
 * The crossDomainClient plugin adds an `ott` (one-time token) query
 * param after OAuth redirect. We detect it client-side via useEffect
 * and keep isPending true until the session appears.
 *
 * SSR-safe: defaults to isPending until the client mounts.
 */
export function useAuthSettled() {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [ottPending, setOttPending] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("ott"),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Once the ott exchange completes (session arrives), clean the URL
  useEffect(() => {
    if (ottPending && session) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ott");
      window.history.replaceState({}, "", url.toString());
      setOttPending(false);
    }
  }, [ottPending, session]);

  return {
    session,
    isAuthenticated: !!session,
    isPending: !mounted || isPending || ottPending,
  };
}
