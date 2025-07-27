import { createFileRoute, notFound } from "@tanstack/react-router";
import * as React from "react";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import { BackIcon, PlayIcon, EditIcon, SaveIcon } from "~/components/ui/Icons";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  recordingQueryOptions,
  formatDuration,
  updateRecordingTranscription,
  updateRecordingNotes,
} from "~/utils/recordings";
import { TranscribeButton } from "~/components/transcription/TranscribeButton";
import { TranscriptionDisplay } from "~/components/transcription/TranscriptionDisplay";
import { TranslationAccordion } from "~/components/translation/TranslationAccordion";

// A dynamic recording view that shows transcription and notes in one page
function RecordingDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch recording data
  const recordingQuery = useSuspenseQuery(recordingQueryOptions(id));
  const { data: recording } = recordingQuery;
  const isLoading = recordingQuery.isLoading;
  const isError = recordingQuery.isError;

  const [transcriptionText, setTranscriptionText] = React.useState(
    recording?.transcriptionText || recording?.transcription?.text || "",
  );
  const [notesContent, setNotesContent] = React.useState(
    recording?.notes?.content || "",
  );
  const [editingTranscription, setEditingTranscription] = React.useState(false);
  const [editingNotes, setEditingNotes] = React.useState(false);

  React.useEffect(() => {
    if (recording) {
      setTranscriptionText(
        recording.transcriptionText || recording.transcription?.text || "",
      );
      setNotesContent(recording.notes?.content || "");
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

  // Mutations for updating transcription and notes
  const updateTranscriptionMutation = useMutation({
    mutationFn: updateRecordingTranscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recording", id] });
      setEditingTranscription(false);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: updateRecordingNotes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recording", id] });
      setEditingNotes(false);
    },
  });

  const handleSaveTranscription = () => {
    updateTranscriptionMutation.mutate({
      data: {
        id,
        transcription: {
          text: transcriptionText,
          isComplete: true,
        },
      },
    });
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      data: {
        id,
        notes: {
          content: notesContent,
        },
      },
    });
  };

  const vocabularyItems = recording.notes?.vocabulary || [];

  // Action bar for both mobile and desktop
  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: "Back",
        icon: <BackIcon className="w-4 h-4" />,
        to: "/recordings",
      }}
      primaryAction={
        editingTranscription || editingNotes
          ? {
              label: "Save Changes",
              icon: <SaveIcon className="w-4 h-4" />,
              onClick: () => {
                if (editingTranscription) handleSaveTranscription();
                if (editingNotes) handleSaveNotes();
              },
              primary: true,
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{recording.title}</h1>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap mt-1">
              <span>{recording.language}</span>
              <span className="mx-1.5">•</span>
              <span>{formattedDuration}</span>
              <span className="mx-1.5">•</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <PlayIcon className="w-5 h-5 text-primary" />
            Play Recording
          </button>
        </div>

        {/* Transcription Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Transcription</h2>
            {recording.isTranscribed && (
              <button
                onClick={() => setEditingTranscription(!editingTranscription)}
                className="flex items-center text-sm text-primary hover:text-secondary"
              >
                <EditIcon className="w-4 h-4 mr-1" />
                {editingTranscription ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

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
              readOnly={!editingTranscription}
            />
          )}

          {editingTranscription ? (
            <div className="mt-4">
              <textarea
                className="w-full min-h-[120px] p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)] mb-2 resize-none"
                value={transcriptionText}
                onChange={(e) => setTranscriptionText(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveTranscription}
                  className="py-1 px-4 bg-primary text-white rounded hover:bg-secondary transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : null}

          {recording.transcription?.romanization && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm text-gray-500 dark:text-gray-400 mt-2">
              <div className="font-medium mb-1">Romanization</div>
              {recording.transcription.romanization}
            </div>
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
              onClick={() => setEditingNotes(!editingNotes)}
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
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  className="py-1 px-4 bg-primary text-white rounded hover:bg-secondary transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg mb-2">
              {notesContent || "No notes available yet."}
            </div>
          )}
        </div>

        {/* Vocabulary Section */}
        {vocabularyItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Vocabulary</h2>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-4">
              {vocabularyItems.map((item, index) => (
                <div key={index} className="flex justify-between mb-2">
                  <div className="font-medium">{item.word}</div>
                  <div>{item.meaning}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/recordings/$id")({
  loader: async ({ params: { id }, context }) => {
    try {
      const data = await context.queryClient.ensureQueryData(
        recordingQueryOptions(id),
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
