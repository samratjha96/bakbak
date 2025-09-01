import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticatedServer } from "~/server/auth";
import { createServerFn } from "@tanstack/react-start";
import * as React from "react";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import {
  RecordIcon,
  PlayIcon,
  CloseIcon,
  SaveIcon,
  PauseIcon,
} from "~/components/ui/Icons";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRecording } from "~/lib/recordings";
import { formatDuration } from "~/utils/formatting";
import { useAudioRecorder } from "~/hooks/useAudioRecorder";
import { AudioWaveform } from "~/components/AudioWaveform";
import { AudioWaveSurferPlayer } from "~/components/audio/AudioWaveSurferPlayer";
import { languages } from "~/lib/languages";
import { useSession } from "~/lib/auth-client";
import { getPresignedUploadUrl, getS3Url } from "~/server/s3";
import { RecordingStoragePaths } from "~/services/storage/RecordingStoragePaths";

// Server function co-located with the route that uses it
const uploadAudioRecording = createServerFn({ method: "POST" })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Invalid form data");
    }

    const audioFile = data.get("audioFile") as File;
    const userId = data.get("userId") as string;
    const fileExtension = (data.get("fileExtension") as string) || "webm";
    const contentType =
      (data.get("contentType") as string) || `audio/${fileExtension}`;

    if (!userId) {
      throw new Error("User ID is required for recording upload");
    }

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("Valid audio file is required for upload");
    }

    return { audioFile, userId, fileExtension, contentType };
  })
  .handler(
    async ({ data: { audioFile, userId, fileExtension, contentType } }) => {
      try {
        const audioBlob = new Blob([await audioFile.arrayBuffer()], {
          type: contentType || `audio/${fileExtension}`,
        });

        const storagePath = RecordingStoragePaths.getAudioPath(
          userId,
          fileExtension,
        );

        const recordingUUID =
          RecordingStoragePaths.extractRecordingUUID(storagePath);

        if (!recordingUUID) {
          throw new Error(
            "Failed to generate recording UUID - check system requirements",
          );
        }

        const presignedUrl = await getPresignedUploadUrl({
          data: {
            key: storagePath,
            contentType: contentType || `audio/${fileExtension}`,
          },
        });

        const response = await fetch(presignedUrl, {
          method: "PUT",
          body: audioBlob,
          headers: {
            "Content-Type": contentType || `audio/${fileExtension}`,
          },
        });

        if (!response.ok) {
          const responseText = await response.text();
          console.error(
            `Upload failed: ${response.status} ${response.statusText}`,
            responseText,
          );
          throw new Error(
            `S3 upload failed with status ${response.status}: ${response.statusText}. Response: ${responseText}`,
          );
        }

        const fileUrl = await getS3Url({ data: { key: storagePath } });

        return {
          url: fileUrl,
          recordingUUID,
          storagePath,
          userId,
        };
      } catch (error) {
        console.error(`Upload failed:`, error);
        throw error;
      }
    },
  );

function NewRecordingPage() {
  const [title, setTitle] = React.useState("");
  const [language, setLanguage] = React.useState("hi");
  const [initialNotes, setInitialNotes] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Use our custom hook for audio recording
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl: recordedAudioUrl,
    analyserNode,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  // Update the audioUrl when recording is complete
  React.useEffect(() => {
    if (recordedAudioUrl) {
      setAudioUrl(recordedAudioUrl);
    }
  }, [recordedAudioUrl]);

  // No manual audio element; WaveSurfer handles playback UI

  // Show error messages if recording fails
  React.useEffect(() => {
    if (error) {
      console.error("Recording error:", error);
      // You could add a toast notification here
    }
  }, [error]);

  // Format time as MM:SS
  const formattedTime = formatDuration(duration);

  // Mutation to create a new recording
  const createRecordingMutation = useMutation({
    mutationFn: createRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      navigate({ to: "/recordings" });
    },
  });

  // Track the upload status
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleSave = async () => {
    if (!audioBlob) {
      setUploadError(
        "No audio recording to save. Please record something first.",
      );
      return;
    }

    if (!session?.user?.id) {
      setUploadError("You must be logged in to save recordings.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const blobType = audioBlob.type || "audio/webm";
      const ext = blobType.includes("ogg")
        ? "ogg"
        : blobType.includes("mp4") || blobType.includes("aac")
          ? "m4a"
          : blobType.includes("mpeg")
            ? "mp3"
            : "webm";

      const formData = new FormData();
      const audioFile = new File([audioBlob], `recording.${ext}`, {
        type: blobType,
        lastModified: Date.now(),
      });

      formData.append("audioFile", audioFile);
      formData.append("userId", session.user.id);
      formData.append("fileExtension", ext);
      formData.append("contentType", blobType);

      const uploadResult = await uploadAudioRecording({ data: formData });

      createRecordingMutation.mutate({
        data: {
          title: title || "Untitled Recording",
          language,
          duration: duration,
          audioUrl: uploadResult.url,
          notes: initialNotes ? { content: initialNotes } : undefined,
        },
      });
    } catch (error) {
      console.error("[Upload] Failed to save recording:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload recording. Please try again.";

      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Hide global bottom action bar; we'll provide mobile/desktop scoped CTAs within the page
  const actionBar = <div className="hidden" />;

  return (
    <Layout actionBarContent={actionBar}>
      {/* Main content container with max-width constraint and centered horizontally */}
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 lg:pb-8 max-w-6xl">
        {/* Header - visible on all screen sizes */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-semibold">New Recording</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Record your language practice session
          </p>
        </div>

        {/* Main content section */}
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Recording section */}
            <div className="bg-gradient-to-br from-primary/5 via-white to-white dark:from-primary/10 dark:via-gray-900 dark:to-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6">
              {/* Waveform container with fixed aspect ratio */}
              <div className="relative w-full mb-6">
                {/* Live waveform during recording; WaveSurfer player after */}
                {isRecording ? (
                  <div className="w-full">
                    {/* Keep existing visualizer for live mic */}
                    {analyserNode && (
                      <AudioWaveform
                        analyserNode={analyserNode}
                        isPaused={isPaused}
                        isRecording={isRecording}
                        width={800}
                        height={96}
                        barColor="#6366F1"
                        barGap={2}
                        barWidth={3}
                      />
                    )}
                  </div>
                ) : audioUrl ? (
                  <AudioWaveSurferPlayer url={audioUrl} />
                ) : (
                  <div className="w-full h-10 md:h-16 bg-gradient-to-b from-gray-300 to-gray-300 dark:from-gray-700 dark:to-gray-700 bg-[length:100%_20%,100%_20%,100%_20%] bg-[position:0_0,0_50%,0_100%] bg-no-repeat opacity-50 rounded" />
                )}
              </div>

              <div className="flex flex-col items-center">
                {/* Recording state badge */}
                {isRecording && (
                  <div className="mb-3 inline-flex items-center gap-2 text-sm text-red-600">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    Recording
                  </div>
                )}

                {/* Recording controls - centered flex layout */}
                <div className="flex items-center justify-center gap-5 md:gap-7 mb-3">
                  {/* Primary control: big Pause/Resume while recording, big Record to start */}
                  {isRecording ? (
                    <button
                      className="flex-none p-4 md:p-6 rounded-full shadow-md hover:shadow-lg transition-colors active:scale-95 bg-primary text-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      aria-label={
                        isPaused ? "Resume recording" : "Pause recording"
                      }
                      title={isPaused ? "Resume" : "Pause"}
                    >
                      {isPaused ? (
                        <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
                      ) : (
                        <PauseIcon className="w-6 h-6 md:w-8 md:h-8" />
                      )}
                    </button>
                  ) : !audioUrl ? (
                    <button
                      className="flex-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-md p-4 md:p-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      onClick={startRecording}
                      aria-label="Start recording"
                      title="Start"
                    >
                      <RecordIcon className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                  ) : null}

                  {/* Secondary control: Complete to finalize while recording */}
                  {isRecording && (
                    <button
                      className="flex-none inline-flex items-center gap-2 px-4 py-3 md:px-5 md:py-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                      onClick={stopRecording}
                      aria-label="Complete recording"
                      title="Complete recording"
                    >
                      <SaveIcon className="w-4 h-4" />
                      Complete
                    </button>
                  )}

                  {/* After completion: show smaller Record Again control with confirm, no giant button */}
                  {!isRecording && audioUrl && (
                    <button
                      className="flex-none inline-flex items-center gap-2 px-4 py-3 md:px-5 md:py-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                      onClick={() => {
                        if (
                          confirm("Discard current recording and record again?")
                        ) {
                          resetRecording();
                          setAudioUrl(null);
                        }
                      }}
                      aria-label="Record again"
                      title="Record again"
                    >
                      Record Again
                    </button>
                  )}
                </div>

                {/* Label under primary control for clarity */}
                {isRecording ? (
                  <div className="text-xs text-gray-500 mb-1">
                    {isPaused
                      ? "Paused – tap to resume"
                      : "Recording… tap to pause"}
                  </div>
                ) : !audioUrl ? (
                  <div className="text-xs text-gray-500 mb-1">Tap to start</div>
                ) : null}

                {/* WaveSurfer handles playback UI */}

                {/* Timer - prominent and centered */}
                <div className="text-lg md:text-xl font-medium text-gray-700 dark:text-gray-300">
                  {formattedTime}
                </div>
              </div>
            </div>

            {/* Recording details form */}
            <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold mb-4">Recording Details</h2>

              <div className="space-y-5">
                {/* Title field */}
                <div className="form-group">
                  <label
                    htmlFor="recording-title"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Title
                  </label>
                  <input
                    id="recording-title"
                    type="text"
                    className="w-full h-12 px-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
                    placeholder="Enter recording title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Language selector */}
                <div className="form-group">
                  <label
                    htmlFor="recording-language"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Language
                  </label>
                  <select
                    id="recording-language"
                    className="w-full h-12 px-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                        {lang.nativeName ? ` (${lang.nativeName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes textarea */}
                <div className="form-group">
                  <label
                    htmlFor="recording-notes"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Notes (Optional)
                  </label>
                  <textarea
                    id="recording-notes"
                    className="w-full min-h-[120px] p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 resize-none"
                    placeholder="Add any notes about this recording..."
                    value={initialNotes}
                    onChange={(e) => setInitialNotes(e.target.value)}
                  ></textarea>
                </div>

                {/* Desktop action buttons - right aligned */}
                {/* Show upload error if any */}
                {uploadError && (
                  <div className="p-3 mb-4 text-sm text-error-700 bg-error-100 rounded-lg">
                    {uploadError}
                  </div>
                )}

                <div className="hidden lg:flex justify-end gap-4 mt-6">
                  <button
                    className="py-2.5 px-5 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => navigate({ to: "/recordings" })}
                  >
                    Cancel
                  </button>
                  <button
                    className={`py-2.5 px-5 bg-primary text-white rounded-lg hover:bg-secondary transition-colors ${createRecordingMutation.isPending || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={handleSave}
                    disabled={createRecordingMutation.isPending || isUploading}
                  >
                    Save Recording
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky mobile CTA bar - visible only on small screens */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-gray-900/80">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <button
            className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => navigate({ to: "/recordings" })}
          >
            Cancel
          </button>
          <button
            className={`flex-1 py-2.5 px-4 rounded-lg text-white transition-colors ${createRecordingMutation.isPending || isUploading || isRecording || !audioBlob ? "bg-primary/60 cursor-not-allowed" : "bg-primary hover:bg-secondary"}`}
            onClick={handleSave}
            disabled={
              createRecordingMutation.isPending ||
              isUploading ||
              isRecording ||
              !audioBlob
            }
          >
            {isRecording
              ? "Recording..."
              : isUploading
                ? "Uploading..."
                : "Save"}
          </button>
        </div>
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/recordings/new")({
  beforeLoad: async () => {
    const authed = await isAuthenticatedServer();
    if (!authed) {
      throw redirect({ to: "/" });
    }
  },
  component: NewRecordingPage,
});
