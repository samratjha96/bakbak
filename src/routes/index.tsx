import { createFileRoute, redirect } from "@tanstack/react-router";
import HomePage from "~/components/pages/HomePage";
import { isAuthenticatedServer } from "~/server/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const authed = await isAuthenticatedServer();
    if (authed) {
      throw redirect({ to: "/recordings" });
    }
  },
  component: () => <HomePage />,
});
