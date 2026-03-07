// convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const convexSiteUrl = process.env.CONVEX_SITE_URL!;
const localhostOrigin = "http://localhost:3000";

export function parseOrigins(value?: string) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const configuredClientOrigins = Array.from(
  new Set([
    ...parseOrigins(process.env.CLIENT_ORIGINS),
    ...parseOrigins(process.env.CLIENT_ORIGIN),
  ]),
);

const siteUrl =
  process.env.SITE_URL ||
  configuredClientOrigins[0] ||
  localhostOrigin;

export function isAllowedOrigin(origin: string) {
  if (!origin) return false;

  if (configuredClientOrigins.includes(origin)) {
    return true;
  }

  if (origin === localhostOrigin) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: { disabled: optionsOnly },
    baseURL: convexSiteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: (request) => {
      const requestOrigin = request.headers.get("origin") ?? "";
      const trustedOrigins = new Set([
        siteUrl,
        localhostOrigin,
        ...configuredClientOrigins,
      ]);

      if (requestOrigin && isAllowedOrigin(requestOrigin)) {
        trustedOrigins.add(requestOrigin);
      }

      return Array.from(trustedOrigins);
    },
    database: authComponent.adapter(ctx),
    account: {
      storeStateStrategy: "database",
      skipStateCookieCheck: true,
    },
    socialProviders: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      },
    },
    plugins: [
      convex({ authConfig }),
      crossDomain({ siteUrl }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const safeUrl = url
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          const payload = {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Manifest Journal <noreply@manifestjournal.com>",
              to: email,
              subject: "Sign in to Manifest Journal",
              html: `<p>Click <a href="${safeUrl}">here</a> to sign in to Manifest Journal.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
            }),
          };
          let lastError: Error | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const res = await fetch("https://api.resend.com/emails", payload);
            if (res.ok) return;
            const body = await res.text();
            lastError = new Error(`Failed to send magic link email: ${res.status} ${body}`);
            // Don't retry client errors (4xx) — only transient server/rate errors
            if (res.status < 500 && res.status !== 429) throw lastError;
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
          throw lastError!;
        },
      }),
    ],
  });
};
