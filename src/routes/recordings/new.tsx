import { createFileRoute } from "@tanstack/react-router";
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
import { createRecording } from "~/api/recordings";
import { formatDuration } from "~/utils/formatting";
import { useAudioRecorder } from "~/hooks/useAudioRecorder";
import { AudioWaveform } from "~/components/AudioWaveform";
import { languages } from "~/config/languages";
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

    if (!userId) {
      throw new Error("User ID is required for recording upload");
    }

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("Valid audio file is required for upload");
    }

    return { audioFile, userId, fileExtension };
  })
  .handler(async ({ data: { audioFile, userId, fileExtension } }) => {
    // Convert File to Blob for S3 upload
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: `audio/${fileExtension}`,
    });

    // Generate a structured path using the RecordingStoragePaths utility
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

    // Get a presigned URL from the server function
    const presignedUrl = await getPresignedUploadUrl({
      data: {
        key: storagePath,
        contentType: `audio/${fileExtension}`,
      },
    });

    // Upload the file directly to S3
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: audioBlob,
      headers: {
        "Content-Type": `audio/${fileExtension}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `S3 upload failed with status ${response.status}: ${response.statusText}`,
      );
    }

    // Get the public URL for the uploaded file
    const fileUrl = await getS3Url({ data: { key: storagePath } });

    return {
      url: fileUrl,
      recordingUUID,
      storagePath,
      userId,
    };
  });

function NewRecordingPage() {
  const [title, setTitle] = React.useState("");
  const [language, setLanguage] = React.useState("ja");
  const [initialNotes, setInitialNotes] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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

  // Handle play/pause of recorded audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Error playing audio:", err);
      });
    }
  };

  // Listen for audio play/pause events
  React.useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("ended", handleEnded);

    return () => {
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("ended", handleEnded);
    };
  }, [audioRef.current, audioUrl]);

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
      console.error("No audio recording to save");
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
      // Create FormData for the server function
      const formData = new FormData();
      const audioFile = new File([audioBlob], `recording.webm`, {
        type: `audio/webm`,
        lastModified: Date.now(),
      });

      formData.append("audioFile", audioFile);
      formData.append("userId", session.user.id);
      formData.append("fileExtension", "webm");

      // Upload using the co-located server function
      const uploadResult = await uploadAudioRecording({ data: formData });

      // Create a new recording with the uploaded URL
      createRecordingMutation.mutate({
        data: {
          title: title || "Untitled Recording",
          language,
          duration: duration,
          audioUrl: uploadResult.url,
          notes: initialNotes
            ? {
                content: initialNotes,
                vocabulary: [],
              }
            : undefined,
        },
      });
    } catch (error) {
      console.error("Error uploading recording:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload recording. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Action bar for both mobile and desktop
  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: "Cancel",
        icon: <CloseIcon className="w-4 h-4" />,
        to: "/recordings",
      }}
      primaryAction={{
        label: isUploading ? "Uploading..." : "Save Recording",
        icon: <SaveIcon className="w-4 h-4" />,
        onClick: handleSave,
        primary: true,
        disabled: createRecordingMutation.isPending || isUploading,
      }}
    />
  );

  return (
    <Layout actionBarContent={actionBar}>
      {/* Main content container with max-width constraint and centered horizontally */}
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-6xl">
        {/* Header - visible on all screen sizes */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-semibold">New Recording</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Record your language practice session
          </p>
        </div>

        {/* Main content section */}
        <div className="max-w-3xl mx-auto">
          {/* Recording section */}
          <div>
            {/* Recording visualizer and controls */}
            <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6 mb-6">
              {/* Waveform container with fixed aspect ratio */}
              <div className="relative w-full aspect-[4/1] mb-6 flex items-center justify-center">
                {/* Audio waveform visualization */}
                {analyserNode ? (
                  <div className="w-full h-full">
                    <AudioWaveform
                      analyserNode={analyserNode}
                      isPaused={isPaused}
                      isRecording={isRecording}
                      width={300}
                      height={60}
                      barColor="#101828"
                    />
                  </div>
                ) : (
                  /* Waveform placeholder when not recording */
                  <div className="w-full h-10 md:h-16 bg-gradient-to-b from-gray-300 to-gray-300 dark:from-gray-700 dark:to-gray-700 bg-[length:100%_20%,100%_20%,100%_20%] bg-[position:0_0,0_50%,0_100%] bg-no-repeat opacity-50 rounded" />
                )}
              </div>

              <div className="flex flex-col items-center">
                {/* Recording controls - centered flex layout */}
                <div className="flex items-center justify-center gap-6 md:gap-8 mb-4">
                  {/* Play/Pause button - only enabled when there's recorded audio */}
                  <button
                    className={`btn flex-none ${!audioUrl ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={togglePlayback}
                    disabled={!audioUrl}
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-6 h-6 md:w-8 md:h-8" />
                    ) : (
                      <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
                    )}
                  </button>

                  {/* Record/Stop button */}
                  {isRecording ? (
                    <button
                      className="btn flex-none bg-error text-white hover:bg-red-600 p-4 md:p-6 rounded-full shadow-md hover:shadow-lg transition-all"
                      onClick={stopRecording}
                    >
                      <RecordIcon className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                  ) : (
                    <button
                      className="btn flex-none bg-white dark:bg-gray-800 shadow-md p-4 md:p-6 rounded-full shadow-md hover:shadow-lg transition-all"
                      onClick={startRecording}
                    >
                      <RecordIcon className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                  )}

                  {/* Pause/Resume button - only visible when recording */}
                  {isRecording && (
                    <button
                      className="btn flex-none"
                      onClick={isPaused ? resumeRecording : pauseRecording}
                    >
                      {isPaused ? (
                        <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
                      ) : (
                        <PauseIcon className="w-6 h-6 md:w-8 md:h-8" />
                      )}
                    </button>
                  )}
                </div>

                {/* Hidden audio element for playback */}
                {audioUrl && (
                  <audio ref={audioRef} src={audioUrl} className="hidden" />
                )}

                {/* Timer - prominent and centered */}
                <div className="text-lg md:text-xl font-medium text-gray-700 dark:text-gray-300">
                  {formattedTime}
                </div>
              </div>
            </div>

            {/* Recording details form */}
            <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6">
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
    </Layout>
  );
}

export const Route = createFileRoute("/recordings/new")({
  component: NewRecordingPage,
});
