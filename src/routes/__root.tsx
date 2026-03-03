import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "../lib/auth-client";
import { useRef } from "react";
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
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
