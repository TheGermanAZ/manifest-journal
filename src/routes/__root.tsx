import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useRef } from "react";
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const convex = useRef(
    new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
  ).current;

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexAuthProvider client={convex}>
          <Outlet />
        </ConvexAuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
