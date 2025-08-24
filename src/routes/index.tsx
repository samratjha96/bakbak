import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Redirect all users to the recordings page (main dashboard)
    return redirect({ to: "/recordings" });
  },
});
