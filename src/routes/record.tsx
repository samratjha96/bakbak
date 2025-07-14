import { createFileRoute } from "@tanstack/react-router";
import { RecordingScreen } from "~/components/screens";

export const Route = createFileRoute("/record")({
  component: RecordingScreen,
});
