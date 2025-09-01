## Better Auth + TanStack Start: How-To

This guide documents how authentication works in this project using Better Auth with TanStack Start, and provides copy-paste patterns for both server and client code.

### Overview

- Server uses Better Auth with the `reactStartCookies` plugin and exposes the handler at `/api/auth/$`.
- Server functions (via `createServerFn`) resolve the current session using TanStack Start's `getWebRequest()` and filter all data by the authenticated user.
- Client uses the Better Auth React client and `useSession()` for reactive auth state.
- Two helpers centralize auth on the server: `isAuthenticated()` and `getCurrentUserId()`.

### Server setup

1) Auth instance (`src/lib/auth.ts`)

```ts
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { reactStartCookies } from "better-auth/react-start";

export const auth = betterAuth({
  database: new Database("./data/sqlite.db"),
  baseURL: process.env.NODE_ENV === "production"
    ? "https://your-domain"
    : "http://localhost:3010",
  plugins: [reactStartCookies()],
  // providers, options, etc.
});
```

2) Mount the handler (`src/routes/api/auth/$.ts`)

```ts
import { auth } from "~/lib/auth";
import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/auth/$").methods({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```

### Client setup

Auth client (`src/lib/auth-client.ts`):

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : `http://localhost:${process.env.PORT || "3010"}`,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

Use in components:

```tsx
import { useSession } from "~/lib/auth-client";

const { data: session, isPending } = useSession();
```

### Server session access (recommended pattern)

Use TanStack Start's `getWebRequest()` to pass headers to Better Auth. We wrap this in two helpers you can call from server functions.

`src/database/connection.ts`:

```ts
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

export async function isAuthenticated(): Promise<boolean> {
  try {
    const request = getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return !!session;
  } catch {
    return false;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const request = getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
```

### Using auth in server functions

Server functions should:
- First, check `isAuthenticated()` and decide how to behave if unauthenticated.
- Then, call `getCurrentUserId()` and always filter queries by that `userId`.

Example read (return empty list when signed out):

```ts
import { createServerFn } from "@tanstack/react-start";
import { getDatabase, isAuthenticated, getCurrentUserId } from "~/database/connection";

export const fetchRecordings = createServerFn({ method: "GET" }).handler(
  async () => {
    const authed = await isAuthenticated();
    if (!authed) return [];

    const db = getDatabase();
    const userId = await getCurrentUserId();
    const rows = db.prepare(
      `SELECT r.* FROM recordings r WHERE r.user_id = ? ORDER BY r.created_at DESC`
    ).all(userId);
    // map rows → UI type...
    return rows;
  }
);
```

Example protected write (throw when signed out):

```ts
export const updateRecording = createServerFn({ method: "POST" })
  .validator((data: { id: string; title?: string }) => data)
  .handler(async ({ data }) => {
    const authed = await isAuthenticated();
    if (!authed) throw new Error("Not authenticated");

    const db = getDatabase();
    const userId = await getCurrentUserId();
    db.prepare(`UPDATE recordings SET title = ? WHERE id = ? AND user_id = ?`)
      .run(data.title ?? null, data.id, userId);
    // return updated entity...
  });
```

Common return behaviors:
- List reads: return `[]` when unauthenticated.
- Resource reads: `throw notFound()` when unauthenticated or not owner.
- Mutations: `throw new Error("Not authenticated")` when unauthenticated.

Always include `WHERE user_id = ?` in queries.

### Client data fetching patterns

Gate queries on auth state to avoid loading user data when signed out:

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { recordingsQuery } from "~/data/recordings";
import { useSession } from "~/lib/auth-client";

const { data: session, isPending } = useSession();
const recordingsQueryResult = useSuspenseQuery({
  ...recordingsQuery(),
  enabled: !!session,
} as any);
```

For loaders/beforeLoad on the server, you can also read session headers via `getWebRequest()` and call `auth.api.getSession` or pass headers to a framework-specific auth client if preferred.

### Quick checklist

- Server:
  - Expose `/api/auth/$` with `auth.handler`.
  - Use `getWebRequest()` + `auth.api.getSession({ headers })`.
  - Use `isAuthenticated()` and `getCurrentUserId()` in all server functions.
  - Scope all queries with `WHERE user_id = ?`.
- Client:
  - Use `useSession()` for auth state.
  - Gate queries with `enabled: !!session`.
  - Show a sign-in prompt when signed out.

### References

- Better Auth TanStack Start integration (cookies + handler): [Better Auth docs](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/integrations/tanstack.mdx)
- Server session retrieval with headers: [Basic usage: getSession](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/basic-usage.mdx)



## Project conventions and pitfalls (read before changing auth)

- Client auth helpers live in `src/lib/auth-client.ts` only
  - Export `signIn`, `signOut`, `useSession` from the created client
  - Provide `triggerSignIn(callbackURL = "/recordings")` and reuse it in UI
  - Do not create additional client auth files or duplicate helpers

- Server-side session checks are centralized in `src/database/connection.ts`
  - Use `isAuthenticated()` and `getCurrentUserId()` which wrap `getWebRequest()` + `auth.api.getSession({ headers })`
  - If you need new server-side auth helpers, add them here instead of new files

- SSR route guards (no flicker)
  - Use `beforeLoad` in TanStack Start routes and dynamically import server helpers to avoid pulling Node deps into client bundles:

```ts
// Public landing: redirect authed users to /recordings
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { isAuthenticated } = await import("~/database/connection");
    if (await isAuthenticated()) throw redirect({ to: "/recordings" });
  },
  component: HomePage,
});

// Protected routes: redirect unauthenticated to /
export const Route = createFileRoute("/recordings/")({
  beforeLoad: async () => {
    const { isAuthenticated } = await import("~/database/connection");
    if (!(await isAuthenticated())) throw redirect({ to: "/" });
  },
  component: RecordingsPage,
});
```

- OAuth callback destinations
  - Always pass a `callbackURL` when initiating social sign-in so success redirects are deterministic:

```ts
// src/lib/auth-client.ts
export function triggerSignIn(callbackURL: string = "/recordings") {
  return signIn.social({ provider: "google", callbackURL });
}
```

- Sign-out redirects
  - Use the client’s `fetchOptions.onSuccess` to navigate after sign-out (keeps concerns in the client):

```ts
const navigate = useNavigate();
signOut({ fetchOptions: { onSuccess: () => navigate({ to: "/" }) } });
```

- Optional: server-driven sign-out route (TanStack Start recommended)
  - Provide `/logout` that clears the session on the server and redirects with no client race condition:

```ts
// src/routes/logout.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

const logoutFn = createServerFn().handler(async () => {
  const request = getWebRequest();
  await auth.api.signOut({ headers: request.headers });
  throw redirect({ to: "/" });
});

export const Route = createFileRoute("/logout")({
  preload: false,
  loader: () => logoutFn(),
});
```

- Naming & file layout
  - `src/lib/auth.ts` is the Better Auth server instance
  - Do not introduce additional `auth.ts`-like files; it’s confusing
  - Reuse `src/lib/auth-client.ts` for client and `src/database/connection.ts` for server-side checks

- Avoid client-side only redirects for auth
  - Rely on SSR `beforeLoad` guards to prevent UI flicker and stale views
