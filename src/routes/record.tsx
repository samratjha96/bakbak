import { createFileRoute, redirect } from "@tanstack/react-router";

// Route deprecated; redirect to new recordings page without hard reload
export const Route = createFileRoute("/record")({
  beforeLoad: () => {
    throw redirect({ to: "/recordings/new" });
  },
});
