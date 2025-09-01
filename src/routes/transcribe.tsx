import { createFileRoute, redirect } from "@tanstack/react-router";

// Deprecated route: redirect to recordings list without forcing a hard reload
export const Route = createFileRoute("/transcribe")({
  beforeLoad: () => redirect({ to: "/recordings" }),
});
