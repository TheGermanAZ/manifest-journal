import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import '../styles.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  component: Root,
})

function Root() {
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
