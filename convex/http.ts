// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { shallow, ready } from "./health";

const http = httpRouter();

// Health checks
http.route({ path: "/health", method: "GET", handler: shallow });
http.route({ path: "/health/ready", method: "GET", handler: ready });

authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: ["*.vercel.app"],
  },
});
export default http;
