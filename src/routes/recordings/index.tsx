import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import {
  MicrophoneIcon,
  PlusIcon,
  DocumentIcon,
  TrashIcon,
  ChevronRightIcon,
} from "~/components/ui/Icons";
import { Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useSession } from "~/lib/auth-client";
import { useMutation, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { recordingsQuery, deleteRecording } from "~/lib/recordings";
import {
  workspaceRecordingsQuery,
  userWorkspacesQuery,
} from "~/lib/workspaceQueries";
import type { Recording } from "~/database/models/Recording";
import { formatDuration, formatRelativeDate } from "~/utils/formatting";
import { TranscribeButton } from "~/components/transcription/TranscribeButton";
import { TranscriptionStatus as TStatus } from "~/types/recording";
import { useWorkspace } from "~/contexts/WorkspaceContext";

interface StatCardProps {
  value: string | number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label }) => (
  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-col justify-center">
    <div className="text-2xl font-bold mb-1">{value}</div>
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
  </div>
);

interface ActivityItemProps {
  text: string;
  time: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ text, time }) => (
  <div className="py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
    <div className="mb-1">{text}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
  </div>
);

const RecordingCard: React.FC<{
  recording: Recording;
  currentWorkspaceId?: string;
}> = ({ recording, currentWorkspaceId }) => {
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

  return (
    <Link
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
  );
};

// Sidebar component for desktop view
const RecordingsSidebar: React.FC<{
  activities: { id: string; text: string; time: string }[];
}> = ({ activities }) => {
  return (
    <div className="sticky top-20 w-full">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Recent Activity</h2>
        </div>
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            text={activity.text}
            time={activity.time}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to="/recordings/new"
          className="flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white font-medium rounded-lg hover:bg-secondary transition-colors"
        >
          <MicrophoneIcon className="w-4 h-4" />
          New Recording
        </Link>
        <button
          className="flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => {}}
        >
          <PlusIcon className="w-4 h-4" />
          Create Folder
        </button>
      </div>
    </div>
  );
};

function RecordingsPage() {
  const { data: session, isPending } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "User";
  const { currentWorkspaceId } = useWorkspace();

  // Use workspace recordings instead of user recordings
  const { data: recordings = [] } = useQuery({
    ...workspaceRecordingsQuery(currentWorkspaceId || ""),
    enabled: !!session?.user && !!currentWorkspaceId,
  });

  const activities = [
    {
      id: "1",
      text: 'You completed a transcription of "Daily Conversation Practice"',
      time: "Today, 2:35 PM",
    },
    {
      id: "2",
      text: 'You recorded "Daily Conversation Practice"',
      time: "Today, 2:30 PM",
    },
    {
      id: "3",
      text: 'You added notes to "Restaurant Phrases"',
      time: "Yesterday, 7:15 PM",
    },
  ];

  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: "Create Folder",
        icon: <PlusIcon className="w-4 h-4" />,
        onClick: () => {},
      }}
      primaryAction={{
        label: "New Recording",
        icon: <MicrophoneIcon className="w-4 h-4" />,
        to: "/recordings/new",
        primary: true,
      }}
    />
  );

  if (!session && !isPending) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Please sign in</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            You must be signed in to view your recordings.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout actionBarContent={actionBar}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Hello, {userName}</h1>

          {/* Desktop quick actions, hidden on mobile */}
          <div className="hidden md:block lg:hidden">
            <button className="py-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-md text-sm flex items-center gap-1.5">
              <PlusIcon className="w-4 h-4" />
              Create Folder
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard value={recordings.length} label="Total Recordings" />
          <StatCard
            value={
              recordings.filter((r) => {
                const now = new Date();
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                return new Date(r.createdAt) > weekAgo;
              }).length
            }
            label="This Week"
          />
          <StatCard
            value={`${Math.round((recordings.reduce((acc, r) => acc + r.duration, 0) / 60 / 60) * 10) / 10}h`}
            label="Practice Time"
          />
          <StatCard
            value={
              new Set(recordings.map((r) => r.language).filter(Boolean)).size
            }
            label="Languages"
          />
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Recent Recordings
            </h2>
            <div className="flex items-center gap-4">
              {currentWorkspaceId && (
                <Link
                  to="/workspace/$workspaceId"
                  params={{ workspaceId: currentWorkspaceId }}
                  className="text-xs text-blue-600 font-medium inline-flex items-center gap-1 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                >
                  View Workspace
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </Link>
              )}
              <Link
                to="/recordings"
                className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:text-secondary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                View All
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Recording
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  currentWorkspaceId={currentWorkspaceId || undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/recordings/")({
  beforeLoad: async ({ context }) => {
    // This ensures the route only loads for authenticated users
    // The auth client will handle redirects if not authenticated
    return {};
  },
  loader: async ({ context }) => {
    // Workspaces are now managed by the Header component and WorkspaceContext
    // We'll let the component fetch workspace recordings once the workspace ID is available
    return {};
  },
  component: RecordingsPage,
});
