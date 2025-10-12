/**
 * ABOUTME: Authentication session management server functions
 * ABOUTME: Provides server-side authentication checks using Better Auth
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

export const isAuthenticatedServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return !!session;
  },
);

export const getCurrentUserIdServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  },
);