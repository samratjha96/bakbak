import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { inviteUserToWorkspace } from "~/lib/workspace";
import {
  workspaceDetailsQuery,
  workspaceRecordingsQuery,
} from "~/lib/workspaceQueries";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  userRole: "owner" | "editor" | "viewer";
}

interface Recording {
  id: string;
  title: string;
  description?: string;
  language?: string;
  duration: number;
  status: "processing" | "ready" | "error";
  createdAt: string;
}

export const Route = createFileRoute("/workspace/$workspaceId")({
  loader: async ({ params: { workspaceId }, context }) => {
    // Prefetch workspace data using the query system
    const workspaceDetailsPromise = context.queryClient.ensureQueryData(
      workspaceDetailsQuery(workspaceId),
    );
    const workspaceRecordingsPromise = context.queryClient.ensureQueryData(
      workspaceRecordingsQuery(workspaceId),
    );

    try {
      await Promise.all([workspaceDetailsPromise, workspaceRecordingsPromise]);
      return {};
    } catch (error) {
      throw new Response(
        error instanceof Error ? error.message : "Workspace not found",
        {
          status:
            error instanceof Error && error.message === "Forbidden" ? 403 : 404,
        },
      );
    }
  },
  component: WorkspacePage,
  errorComponent: ({ error }) => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Workspace Not Found
        </h1>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  ),
});

function WorkspacePage() {
  const { workspaceId } = Route.useParams();
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Use queries to get data (already prefetched by loader)
  const { data: workspaceData } = useQuery(workspaceDetailsQuery(workspaceId));
  const { data: recordings = [] } = useQuery(
    workspaceRecordingsQuery(workspaceId),
  );

  const workspace = workspaceData
    ? {
        ...workspaceData.workspace,
        userRole: workspaceData.userRole,
        memberCount: workspaceData.memberCount,
      }
    : null;

  const inviteMutation = useMutation({
    mutationFn: inviteUserToWorkspace,
  });

  // Show loading state if workspace data is not yet available
  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleInvite = async (email: string, role: string) => {
    try {
      const result = await inviteMutation.mutateAsync({
        data: {
          workspaceId,
          email,
          role: role as "owner" | "editor" | "viewer",
        },
      });

      alert(`Invitation sent to ${email}`); // In production, use proper toast notification
      setShowInviteModal(false);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Workspace Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {workspace.name}
            </h1>
            {workspace.description && (
              <p className="mt-2 text-gray-600">{workspace.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>
                {workspace.memberCount} member
                {workspace.memberCount !== 1 ? "s" : ""}
              </span>
              <span>•</span>
              <span>Your role: {workspace.userRole}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(workspace.userRole === "owner" ||
              workspace.userRole === "editor") && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Invite Member
              </button>
            )}

            <Link
              to="/recordings/new"
              search={{ workspaceId }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              New Recording
            </Link>
          </div>
        </div>
      </div>

      {/* Recordings List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recordings</h2>

        {recordings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No recordings yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first recording in this workspace.
            </p>
            <Link
              to="/recordings/new"
              search={{ workspaceId }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Recording
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recordings.map((recording) => (
              <Link
                key={recording.id}
                to="/recordings/$id"
                params={{ id: recording.id }}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 line-clamp-2">
                    {recording.title}
                  </h3>
                  <span
                    className={`ml-2 px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                      recording.status === "ready"
                        ? "bg-green-100 text-green-800"
                        : recording.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {recording.status}
                  </span>
                </div>

                {recording.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {recording.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    {recording.language && (
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {recording.language}
                      </span>
                    )}
                    <span>{formatDuration(recording.duration)}</span>
                  </div>
                  <span>{formatDate(recording.createdAt.toString())}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
          canInviteOwners={workspace.userRole === "owner"}
        />
      )}
    </div>
  );
}

interface InviteModalProps {
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
  canInviteOwners: boolean;
}

function InviteModal({ onClose, onInvite, canInviteOwners }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim(), role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 relative">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Invite Team Member
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="colleague@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="viewer">
                Viewer - Can view recordings and add comments
              </option>
              <option value="editor">
                Editor - Can create and edit recordings
              </option>
              {canInviteOwners && (
                <option value="owner">Owner - Full workspace access</option>
              )}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
