import { createFileRoute } from "@tanstack/react-router";

// Route deprecated; redirect to new recordings page for now
export const Route = createFileRoute("/record")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace("/recordings/new");
    }
  },
  component: () => null,
});
