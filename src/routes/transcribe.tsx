import { createFileRoute } from "@tanstack/react-router";

// Deprecated route: redirect to recordings list for now
export const Route = createFileRoute("/transcribe")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace("/recordings");
    }
  },
  component: () => null,
});
