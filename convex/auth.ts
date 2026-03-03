// convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: { disabled: optionsOnly },
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    socialProviders: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      },
    },
    plugins: [
      convex(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Manifest Journal <noreply@manifestjournal.com>",
              to: email,
              subject: "Sign in to Manifest Journal",
              html: `<p>Click <a href="${url}">here</a> to sign in to Manifest Journal.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
            }),
          });
        },
      }),
    ],
  });
};
