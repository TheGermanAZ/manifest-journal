import { createAPIFileRoute } from "@tanstack/react-start/api";
import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

const { handler } = convexBetterAuthReactStart({
  convexUrl: process.env.VITE_CONVEX_URL!,
  convexSiteUrl: process.env.VITE_CONVEX_SITE_URL!,
});

export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => handler(request),
  POST: ({ request }) => handler(request),
});
