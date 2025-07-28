import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:${process.env.PORT || "3010"}`,
});

export const { signIn, signUp, signOut, useSession } = authClient;
