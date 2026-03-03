import { convexAuth } from "@convex-dev/auth/server";
import Resend from "@auth/core/providers/resend";
import Discord from "@auth/core/providers/discord";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Resend,
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
  ],
});
