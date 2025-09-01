import { createFileRoute, redirect } from "@tanstack/react-router";
import HomePage from "~/routes/landing/HomePage";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { isAuthenticated } = await import("~/database/connection");
    if (await isAuthenticated()) {
      throw redirect({ to: "/recordings" });
    }
  },
  component: () => <HomePage />,
});
