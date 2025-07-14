import { createFileRoute } from "@tanstack/react-router";
import { TranscriptionScreen } from "~/components/screens";

export const Route = createFileRoute("/transcribe")({
  component: TranscriptionScreen,
});
