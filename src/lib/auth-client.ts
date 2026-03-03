import { createAuthClient } from "better-auth/react";
import { convexClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    magicLinkClient(),
  ],
});
