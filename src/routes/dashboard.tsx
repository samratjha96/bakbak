import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "~/components/screens";

export const Route = createFileRoute("/dashboard")({
  component: DashboardScreen,
});
