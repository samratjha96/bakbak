import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

export const isAuthenticatedServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return !!session;
  },
);

export const getCurrentUserIdServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  },
);
