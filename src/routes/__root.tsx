import { Outlet, createRootRoute, HeadContent, Scripts, Link } from '@tanstack/react-router'
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "../lib/auth-client";
import { useRef } from "react";
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-stone-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-stone-500">{error.message}</p>
        <a href="/" className="mt-4 inline-block text-sm font-medium text-stone-900 hover:underline">
          Reload
        </a>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900">Page not found</h1>
        <p className="mt-2 text-sm text-stone-500">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-stone-900 hover:underline">
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
          <Outlet />
        </ConvexBetterAuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
