import { createFileRoute, redirect } from "@tanstack/react-router";
import { LandingScreen } from "~/components/screens";

export const Route = createFileRoute("/")({
  component: LandingScreen,
  beforeLoad: () => {
    // Redirect authenticated users to the recordings page
    // For demonstration purposes, we'll always redirect to recordings
    return redirect({ to: "/recordings" });
  },
});
