import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { isAuthenticatedServer } from "~/server/auth";
import * as React from "react";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import { BackIcon, EditIcon, SaveIcon } from "~/components/ui/Icons";
import { Link } from "@tanstack/react-router";
import {
  useMutation,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  recordingQuery,
  updateRecordingNotes,
  updateRecording,
  getRecordingPresignedUrl,
} from "~/lib/recordings";
import { formatDuration } from "~/utils/formatting";
import { TranscribeButton } from "~/components/transcription/TranscribeButton";
import { TranscriptionDisplay } from "~/components/transcription/TranscriptionDisplay";
import { TranslationAccordion } from "~/components/translation/TranslationAccordion";
import { AudioWaveSurferPlayer } from "~/components/audio/AudioWaveSurferPlayer";

function RecordingPlayer({
  fetchPresignedUrl,
}: {
  fetchPresignedUrl: () => Promise<
    string | { url: string; directUrl?: string }
  >;
}) {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchPresignedUrl();
        const url = typeof res === "string" ? res : res.url || res.directUrl;
        if (mounted) setResolvedUrl(url || null);
      } catch (_) {
        if (mounted) setFailed(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchPresignedUrl]);

  // Hide the whole section if we cannot resolve a playable URL (or still loading)
  if (failed || !resolvedUrl) return null;

  return (
    <AudioWaveSurferPlayer
      url={resolvedUrl}
      className="w-full sm:w-[520px] max-w-full"
    />
  );
}

// A dynamic recording view that shows transcription and notes in one page
function RecordingDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  // Fetch recording data
  const recordingQueryResult = useSuspenseQuery(recordingQuery(id));
  const { data: recording } = recordingQueryResult;
  const isLoading = recordingQueryResult.isLoading;
  const isError = recordingQueryResult.isError;

  // Define presigned URL fetch function with caching
  const fetchPresignedUrl = React.useCallback(async (): Promise<
    string | { url: string; directUrl?: string }
  > => {
    // Try to get from cache first
    const cachedData = queryClient.getQueryData<any>([
      "recording",
      id,
      "presignedUrl",
    ]);

    // Return cached data if valid and not expired
    if (cachedData && cachedData.url) {
      return cachedData as {
        url: string;
        directUrl?: string;
        expiresAt?: string;
      };
    }

    try {
      // Fetch new URL if not cached or expired
      const result = await getRecordingPresignedUrl({ data: id });

      // Cache the result
      queryClient.setQueryData(["recording", id, "presignedUrl"], result);

      return result as { url: string; directUrl?: string };
    } catch (error) {
      console.error("Error fetching presigned URL:", error);
      throw error; // Re-throw to let the AudioPlayer component handle it
    }
  }, [id, queryClient]);

  // Only manage state for fields we're actually editing in this component
  const [notesContent, setNotesContent] = React.useState(
    recording?.notes?.content || "",
  );
  const [title, setTitle] = React.useState(recording?.title || "");
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [editingTitle, setEditingTitle] = React.useState(false);

  React.useEffect(() => {
    if (recording) {
      setNotesContent(recording.notes?.content || "");
      setTitle(recording.title || "");
    }
  }, [recording]);

  // Format duration as MM:SS
  const formattedDuration = formatDuration(recording.duration);

  // Format date
  const formattedDate = React.useMemo(() => {
    return new Date(recording.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [recording.createdAt]);

  // Mutation for updating notes
  const updateNotesMutation = useMutation({
    mutationFn: async (notesData: {
      id: string;
      notes: { content: string };
    }) => {
      try {
        return await updateRecordingNotes({ data: notesData });
      } catch (error) {
        // Transform server errors into user-friendly messages
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save notes. Please try again.";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recording", id] });
      setEditingNotes(false);
    },
  });

  // Mutation for updating recording title
  const updateTitleMutation = useMutation({
    mutationFn: async (recordingData: { id: string; title: string }) => {
      try {
        return await updateRecording({ data: recordingData });
      } catch (error) {
        // Transform server errors into user-friendly messages
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save title. Please try again.";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recording", id] });
      setEditingTitle(false);
    },
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      id,
      notes: {
        content: notesContent,
      },
    });
  };

  const handleSaveTitle = () => {
    updateTitleMutation.mutate({
      id,
      title,
    });
  };

  // Action bar for both mobile and desktop
  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: "Back",
        icon: <BackIcon className="w-4 h-4" />,
        to: "/recordings",
      }}
      primaryAction={
        editingNotes || editingTitle
          ? {
              label:
                updateNotesMutation.isPending || updateTitleMutation.isPending
                  ? "Saving..."
                  : "Save Changes",
              icon: <SaveIcon className="w-4 h-4" />,
              onClick: () => {
                if (editingNotes) handleSaveNotes();
                if (editingTitle) handleSaveTitle();
              },
              primary: true,
              disabled:
                updateNotesMutation.isPending || updateTitleMutation.isPending,
            }
          : {
              label: "",
              icon: <></>,
              onClick: () => {},
            }
      }
    />
  );

  return (
    <Layout actionBarContent={actionBar}>
      <div className="container py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6">
          <div className="flex-1">
            {editingTitle ? (
              <div className="mb-2">
                <input
                  type="text"
                  className="text-xl sm:text-2xl font-semibold bg-transparent border-b-2 border-primary focus:outline-none w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setTitle(recording.title);
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 group">
                <h1 className="text-xl sm:text-2xl font-semibold">
                  {recording.title}
                </h1>
                <button
                  onClick={() => setEditingTitle(true)}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <EditIcon className="w-4 h-4 text-gray-400 hover:text-primary" />
                </button>
              </div>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center mt-1">
              <span>{recording.language}</span>
              <span className="mx-1.5">•</span>
              <span>{formattedDuration}</span>
              <span className="mx-1.5">•</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* WaveSurfer player with scrubbing and duration */}
          <div className="w-full sm:w-auto">
            <RecordingPlayer fetchPresignedUrl={fetchPresignedUrl} />
          </div>
        </div>

        {/* Transcription Section - Let TranscriptionDisplay handle its own editing */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Transcription</h2>

          {!recording.isTranscribed &&
            recording.transcriptionStatus !== "IN_PROGRESS" && (
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
                  This recording hasn't been transcribed yet.
                </p>
                <TranscribeButton
                  recordingId={id}
                  variant="primary"
                  size="md"
                  currentStatus={recording.transcriptionStatus}
                />
              </div>
            )}

          {(recording.isTranscribed ||
            recording.transcriptionStatus === "IN_PROGRESS") && (
            <TranscriptionDisplay
              recordingId={id}
              initialTranscriptionText={
                recording.transcriptionText ||
                recording.transcription?.text ||
                ""
              }
              initialStatus={recording.transcriptionStatus}
              initialLastUpdated={recording.transcriptionLastUpdated}
              readOnly={false}
            />
          )}
        </div>

        {/* Translation Section - Only show if transcription exists */}
        {recording.isTranscribed && (
          <div className="mb-8">
            <TranslationAccordion
              recordingId={id}
              initialTranslationText={recording.translationText}
              initialTranslationLanguage={recording.translationLanguage}
              initialLastUpdated={recording.translationLastUpdated}
              initialStatus={
                recording.isTranslated ? "COMPLETED" : "NOT_STARTED"
              }
            />
          </div>
        )}

        {/* Notes Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Notes</h2>
            <button
              onClick={() => {
                if (editingNotes) {
                  setNotesContent(recording.notes?.content || "");
                  setEditingNotes(false);
                } else {
                  setEditingNotes(true);
                }
              }}
              className="flex items-center text-sm text-primary hover:text-secondary"
            >
              <EditIcon className="w-4 h-4 mr-1" />
              {editingNotes ? "Cancel" : "Edit"}
            </button>
          </div>

          {editingNotes ? (
            <div>
              <textarea
                className="w-full min-h-[120px] p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)] mb-2 resize-none"
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                placeholder="Add your notes here..."
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={updateNotesMutation.isPending}
                  className="py-2 px-6 bg-primary text-white rounded hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {updateNotesMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg mb-2 min-h-[60px] whitespace-pre-wrap">
              {notesContent ||
                "No notes available yet. Click 'Edit' to add some notes."}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/recordings/$id")({
  beforeLoad: async () => {
    const authed = await isAuthenticatedServer();
    if (!authed) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ params: { id }, context }) => {
    try {
      const data = await context.queryClient.ensureQueryData(
        recordingQuery(id),
      );
      return {
        title: data.title,
      };
    } catch (error) {
      if (error === notFound()) {
        throw notFound();
      }
      throw error;
    }
  },
  component: RecordingDetailPage,
  notFoundComponent: () => {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h2 className="text-xl font-medium mb-4">Recording not found</h2>
          <Link to="/recordings" className="text-primary hover:text-secondary">
            Return to Recordings
          </Link>
        </div>
      </Layout>
    );
  },
});
