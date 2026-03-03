import { createAPIFileRoute } from "@tanstack/react-start/api";
import { reactStartHandler } from "@convex-dev/better-auth/react-start";

export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => reactStartHandler(request),
  POST: ({ request }) => reactStartHandler(request),
});
