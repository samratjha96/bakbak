import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import { MicrophoneIcon, PlusIcon, DocumentIcon, TrashIcon, ChevronRightIcon } from "~/components/ui/Icons";
import { Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useSession } from "~/lib/auth-client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { recordingsQuery, deleteRecording } from "~/lib/recordings";
import type { Recording } from "~/types/recording";
import { formatDuration, formatRelativeDate } from "~/utils/formatting";
import { TranscribeButton } from "~/components/transcription/TranscribeButton";
import { TranscriptionStatus as TStatus } from "~/types/recording";

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

const RecordingItem: React.FC<{
  id: string;
  title: string;
  language?: string;
  duration: number;
  date: string;
  isTranscribed?: boolean;
  transcriptionStatus?: TStatus;
  onDeleted?: (id: string) => void;
}> = ({
  id,
  title,
  language,
  duration,
  date,
  isTranscribed = false,
  transcriptionStatus = "NOT_STARTED",
  onDeleted,
}) => {
  // Format duration as MM:SS
  const formattedDuration = formatDuration(duration);
  const navigate = useNavigate();
  const deleteMutation = useMutation({
    mutationFn: async () => deleteRecording({ data: id }),
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button or link
    if (
      (e.target as Element).closest("button") ||
      (e.target as Element).closest("a")
    ) {
      return;
    }
    navigate({ to: "/recordings/$id", params: { id } });
  };

  return (
    <div
      onClick={handleCardClick}
      className="group flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors gap-4"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
      aria-label={`Open recording ${title}`}
    >
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
        <MicrophoneIcon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {title}
          </div>
          {isTranscribed && (
            <div className="ml-2 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-sm flex items-center">
              <DocumentIcon className="w-3 h-3 mr-1" />
              <span>Transcribed</span>
            </div>
          )}
          {transcriptionStatus === "IN_PROGRESS" && (
            <div className="ml-2 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-sm flex items-center">
              <div className="w-3 h-3 mr-1 rounded-full border-2 border-solid border-current border-r-transparent animate-spin"></div>
              <span>Processing</span>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap mt-1 gap-1.5">
          <span>{language}</span>
          <span>•</span>
          <span>{formattedDuration}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isTranscribed && transcriptionStatus !== "IN_PROGRESS" && (
          <TranscribeButton
            recordingId={id}
            variant="outline"
            size="sm"
            className="px-2 py-1 text-xs"
            currentStatus={transcriptionStatus}
          />
        )}
        <Link to="/recordings/$id" params={{ id }} className="text-primary hover:text-secondary flex-shrink-0 text-sm font-medium">
          View
        </Link>
        <button
          className="ml-1 inline-flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors"
          onClick={async (e) => {
            e.stopPropagation();
            if (deleteMutation.isPending) return;
            const confirmed = confirm("Delete this recording? This cannot be undone.");
            if (!confirmed) return;
            try {
              await deleteMutation.mutateAsync();
              onDeleted?.(id);
            } catch (err) {
              alert(
                err instanceof Error
                  ? err.message
                  : "Failed to delete recording. Please try again.",
              );
            }
          }}
          aria-label="Delete recording"
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Delete</span>
        </button>
        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-gray-400 ml-1" />
      </div>
    </div>
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
  const recordingsQueryResult = useSuspenseQuery({
    ...recordingsQuery(),
    enabled: !!session,
  } as any);
  const recordings: Recording[] = (recordingsQueryResult.data as any) || [];
  const isLoading = recordingsQueryResult.isLoading;
  const isError = recordingsQueryResult.isError;
  const userName = session?.user?.name?.split(" ")[0] || "User";

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
          <p className="text-gray-600 dark:text-gray-300">You must be signed in to view your recordings.</p>
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
              {session?.user && (
                <Link 
                  to="/workspace/$workspaceId" 
                  params={{ workspaceId: `personal-${session.user.id}` }}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700"
                >
                  View Workspace
                </Link>
              )}
              <span className="text-xs text-primary font-medium cursor-pointer">
                View All
              </span>
            </div>
          </div>

          {recordings.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
              <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MicrophoneIcon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">No recordings yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Start your first practice session to see it here.</p>
              <Link to="/recordings/new" className="inline-flex items-center gap-2 py-2 px-4 bg-primary text-white rounded-lg hover:bg-secondary">
                <MicrophoneIcon className="w-4 h-4" />
                Start Recording
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              {recordings.map((recording, index) => (
                <React.Fragment key={recording.id}>
                  {index > 0 && (
                    <div className="mx-4 border-t border-gray-100 dark:border-gray-800"></div>
                  )}
                  <RecordingItem
                    id={recording.id}
                    title={recording.title}
                    language={recording.language}
                    duration={recording.duration}
                    date={formatRelativeDate(new Date(recording.createdAt))}
                    isTranscribed={recording.isTranscribed}
                    transcriptionStatus={recording.transcriptionStatus}
                    onDeleted={() => recordingsQueryResult.refetch()}
                  />
                </React.Fragment>
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
    await context.queryClient.ensureQueryData(recordingsQuery());
    return {};
  },
  component: RecordingsPage,
});
