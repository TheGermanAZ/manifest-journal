import { Outlet, createRootRoute, HeadContent, Scripts, Link } from '@tanstack/react-router'
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "../lib/auth-client";
import { useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AppAuthProvider } from "../lib/AppAuthProvider";
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-normal display-title text-[var(--ink)]">Something went wrong</h1>
        <p className="mt-2 text-base text-[var(--ink-light)]">{error.message}</p>
        <a href="/" className="mt-4 inline-block text-base font-medium text-[var(--ink)] hover:text-[var(--vermillion)] transition-colors">
          Reload
        </a>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-normal display-title text-[var(--ink)]">Page not found</h1>
        <p className="mt-2 text-base text-[var(--ink-light)]">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block text-base font-medium text-[var(--ink)] hover:text-[var(--vermillion)] transition-colors">
          Go home
        </Link>
      </div>
    </div>
  ),
})

function Root() {
  const convex = useRef(
    new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
      expectAuth: true,
    })
  ).current;

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <AppAuthProvider>
            <Outlet />
          </AppAuthProvider>
        </ConvexBetterAuthProvider>
        <Analytics />
        <Scripts />
      </body>
    </html>
  )
}
