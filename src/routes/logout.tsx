import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

const logoutFn = createServerFn().handler(async () => {
  const request = getWebRequest();
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch (_) {
    // ignore - proceed to redirect regardless
  }
  throw redirect({ to: "/" });
});

export const Route = createFileRoute("/logout")({
  preload: false,
  loader: () => logoutFn(),
});
