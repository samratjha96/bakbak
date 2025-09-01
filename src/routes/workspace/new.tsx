import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { createWorkspace } from "~/lib/workspace";

export const Route = createFileRoute("/workspace/new")({
  component: NewWorkspacePage,
});

function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (workspace) => {
      // Navigate to the new workspace
      router.navigate({
        to: "/workspace/$workspaceId",
        params: { workspaceId: workspace.id },
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }

    setError(null);
    createWorkspaceMutation.mutate({
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto mt-8 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Create New Workspace
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workspace Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="My Team Workspace"
              required
              disabled={createWorkspaceMutation.isPending}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="A collaborative space for our team's audio recordings..."
              disabled={createWorkspaceMutation.isPending}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.history.back()}
              className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              disabled={createWorkspaceMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              disabled={createWorkspaceMutation.isPending || !name.trim()}
            >
              {createWorkspaceMutation.isPending
                ? "Creating..."
                : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          You'll be able to invite team members after creating the workspace.
        </p>
      </div>
    </div>
  );
}
