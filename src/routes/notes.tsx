import { createFileRoute } from "@tanstack/react-router";
import { NotesScreen } from "~/components/screens";

export const Route = createFileRoute("/notes")({
  component: NotesScreen,
});
