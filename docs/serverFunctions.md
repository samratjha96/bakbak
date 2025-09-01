## Server Functions (TanStack Start)

This guide captures our conventions for creating and using server functions with TanStack Start in this project.

### Overview

- Use `createServerFn` for server-only logic (data read/write, auth-sensitive ops).
- Use `validator` for input validation; keep handlers small and cohesive.
- For auth-aware logic, call `isAuthenticated()` and `getCurrentUserId()` from `~/database/connection`.
- Trigger redirects on the server by throwing `redirect({ to: "/path" })`.
- Access request headers (for Better Auth, etc.) with `getWebRequest()` inside handlers.

### Basic patterns

Create a read server function:

```ts
import { createServerFn } from "@tanstack/react-start";
import { getDatabase, isAuthenticated, getCurrentUserId } from "~/database/connection";

export const listUserThings = createServerFn({ method: "GET" }).handler(async () => {
  const authed = await isAuthenticated();
  if (!authed) return [];

  const userId = await getCurrentUserId();
  const db = getDatabase();
  return db.prepare("SELECT * FROM things WHERE user_id = ? ORDER BY created_at DESC").all(userId);
});
```

Create a write server function with validation:

```ts
export const createThing = createServerFn({ method: "POST" })
  .validator((data: { title: string }) => {
    if (!data?.title) throw new Error("title is required");
    return data;
  })
  .handler(async ({ data }) => {
    const authed = await isAuthenticated();
    if (!authed) throw new Error("Not authenticated");

    const userId = await getCurrentUserId();
    const db = getDatabase();
    db.prepare("INSERT INTO things (user_id, title) VALUES (?, ?)").run(userId, data.title);
    return { ok: true } as const;
  });
```

### Using in routes (SSR, no flicker)

- Use `beforeLoad` to guard routes (auth, access), and `loader` to prefetch data.
- Dynamically import server helpers in `beforeLoad` to avoid pulling Node modules client-side.

```ts
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/protected")({
  beforeLoad: async () => {
    const { isAuthenticated } = await import("~/database/connection");
    if (!(await isAuthenticated())) throw redirect({ to: "/" });
  },
  loader: async () => {
    const { listUserThings } = await import("~/server/things");
    return listUserThings();
  },
  component: ProtectedPage,
});
```

### Server-driven redirect flows (Logout)

Recommended pattern: clear session on the server, then redirect.

```ts
// src/routes/logout.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

const logoutFn = createServerFn().handler(async () => {
  const request = getWebRequest();
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch {}
  throw redirect({ to: "/" });
});

export const Route = createFileRoute("/logout")({
  preload: false,
  loader: () => logoutFn(),
});
```

Call it from the client/UI with a normal navigation:

```ts
const navigate = useNavigate();
<button onClick={() => navigate({ to: "/logout" })}>Sign Out</button>
```

### File upload pattern (FormData)

Use `FormData` and validate inputs server-side:

```ts
export const uploadSomething = createServerFn({ method: "POST" })
  .validator((data) => {
    if (!(data instanceof FormData)) throw new Error("Invalid form data");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("file required");
    return { file };
  })
  .handler(async ({ data: { file } }) => {
    // Persist or forward to storage service
    return { ok: true } as const;
  });
```

### Error handling

- Throw `redirect({ to })` for navigation.
- Throw `new Error("message")` for failures; catch and map to user messages in the client.
- Keep server errors generic; avoid leaking internals.

### Conventions & pitfalls

- Place server-only utilities in server-friendly modules; avoid importing Node APIs in components.
- For auth-aware functions, reuse `~/database/connection` helpers.
- Prefer SSR guards for auth (`beforeLoad`) to avoid flicker.
- Co-locate small, route-specific `createServerFn` next to routes; extract shared logic into `~/server/*` when reused.
- Validate inputs with `.validator()`; never trust client payloads.


