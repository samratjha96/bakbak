import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EditIcon, SaveIcon } from "~/components/ui/Icons";
import { TranscriptionStatus } from "./TranscriptionStatus";
import { TranscriptionStatus as TStatus } from "~/types/recording";
import {
  updateRecordingTranscription,
  transcriptionStatusQuery,
} from "~/lib/recordings";
import { fetchTranscriptionData } from "~/server/transcription";
import { getErrorMessage } from "~/utils/errorHandling";

interface TranscriptionDisplayProps {
  recordingId: string;
  initialTranscriptionText?: string;
  initialStatus?: TStatus;
  initialLastUpdated?: Date;
  className?: string;
  readOnly?: boolean;
}

/**
 * Component to view and edit transcription text
 */
export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  recordingId,
  initialTranscriptionText = "",
  initialStatus = "NOT_STARTED",
  initialLastUpdated,
  className = "",
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState(
    initialTranscriptionText,
  );
  const queryClient = useQueryClient();

  // Bind server function safely
  const boundFetchTranscription = useServerFn(fetchTranscriptionData);

  // Fetch the current transcription data using the bound server function with polling
  const {
    data: transcriptionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transcription", recordingId],
    queryFn: () => boundFetchTranscription({ data: recordingId }),
    select: (data) => ({
      ...data,
      transcriptionText: data.transcriptionText || initialTranscriptionText,
      transcriptionStatus: data.transcriptionStatus || initialStatus,
      transcriptionLastUpdated:
        data.transcriptionLastUpdated || initialLastUpdated,
    }),
    enabled: !!recordingId,
    // Add polling while transcription is in progress
    refetchInterval: (data: any) =>
      data?.transcriptionStatus === "IN_PROGRESS" ? 5000 : false,
    refetchIntervalInBackground: true,
  });

  // Use derived values from query data instead of separate state
  // Show the original transcription text as primary content
  const displayTranscriptionText = useMemo(() => {
    const baseText =
      transcriptionData?.transcriptionText || initialTranscriptionText || "";
    return baseText;
  }, [transcriptionData?.transcriptionText, initialTranscriptionText]);

  // Romanization displayed in a separate section
  const romanizationText = useMemo(
    () => (transcriptionData as any)?.romanization as string | undefined,
    [(transcriptionData as any)?.romanization],
  );

  const displayStatus = useMemo(
    () => transcriptionData?.transcriptionStatus || initialStatus,
    [transcriptionData?.transcriptionStatus, initialStatus],
  );

  const displayLastUpdated = useMemo(
    () => transcriptionData?.transcriptionLastUpdated || initialLastUpdated,
    [transcriptionData?.transcriptionLastUpdated, initialLastUpdated],
  );

  // Poll transcription job status while it's in progress
  const { data: jobStatusData } = useQuery({
    ...transcriptionStatusQuery(recordingId),
    enabled: displayStatus === "IN_PROGRESS",
  });

  // When the job completes, refresh the recording and transcription queries
  useEffect(() => {
    if ((jobStatusData as any)?.transcriptionStatus === "COMPLETED") {
      queryClient.invalidateQueries({ queryKey: ["recording", recordingId] });
      queryClient.invalidateQueries({
        queryKey: ["transcription", recordingId],
      });
    }
  }, [jobStatusData?.transcriptionStatus, queryClient, recordingId]);

  // Mutation to update transcription using server function
  const updateTranscriptionMutation = useMutation({
    mutationFn: (newText: string) =>
      updateRecordingTranscription({
        data: {
          id: recordingId,
          transcription: {
            text: newText,
            isComplete: true,
          },
        },
      }),
    onError: (error) => {
      // Simple error handling without logging
      console.error(getErrorMessage(error, `Failed to update transcription`));
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["transcription", recordingId],
      });
      queryClient.invalidateQueries({ queryKey: ["recording", recordingId] });

      // Exit editing mode
      setIsEditing(false);
    },
  });

  const handleSaveTranscription = () => {
    updateTranscriptionMutation.mutate(transcriptionText);
  };

  // If we're still loading and have no initial data
  if (isLoading && !initialTranscriptionText) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2.5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2.5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    );
  }

  // If there was an error
  if (error) {
    return (
      <div className={`text-red-600 dark:text-red-400 ${className}`}>
        Error loading transcription:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  // If there's no transcription yet
  if (!displayTranscriptionText && displayStatus !== "IN_PROGRESS") {
    return (
      <div className={`text-gray-500 dark:text-gray-400 italic ${className}`}>
        No transcription available. Start a transcription to see results here.
      </div>
    );
  }

  // If transcription is in progress
  if (displayStatus === "IN_PROGRESS") {
    return (
      <div className={className}>
        <TranscriptionStatus
          status={displayStatus}
          lastUpdated={displayLastUpdated}
          className="mb-4"
        />
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transcription in progress...
            </p>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <TranscriptionStatus
          status={displayStatus}
          lastUpdated={displayLastUpdated}
        />
        {!readOnly && (
          <button
            onClick={() =>
              isEditing ? setIsEditing(false) : setIsEditing(true)
            }
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors"
          >
            {isEditing ? (
              <>
                <EditIcon className="w-4 h-4" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <EditIcon className="w-4 h-4" />
                <span>Edit</span>
              </>
            )}
          </button>
        )}
      </div>

      {isEditing && !readOnly ? (
        <div>
          <div className="relative">
            <textarea
              value={transcriptionText}
              onChange={(e) => setTranscriptionText(e.target.value)}
              className="w-full min-h-[200px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)] mb-2"
              placeholder="Enter or edit transcription text..."
            />
            {updateTranscriptionMutation.isPending && (
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveTranscription}
              disabled={updateTranscriptionMutation.isPending}
              className="flex items-center gap-1.5 py-1 px-3 bg-primary text-white text-sm rounded hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SaveIcon className="w-4 h-4" />
              {updateTranscriptionMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="whitespace-pre-wrap bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {displayTranscriptionText || "No transcription content available."}
          </div>

          {romanizationText && romanizationText.trim().length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Romanization
              </div>
              <div className="whitespace-pre-wrap bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-700 dark:text-gray-300">
                {romanizationText}
              </div>
            </div>
          )}
        </div>
      )}

      {updateTranscriptionMutation.isError && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          Error saving transcription:{" "}
          {updateTranscriptionMutation.error instanceof Error
            ? updateTranscriptionMutation.error.message
            : String(updateTranscriptionMutation.error)}
        </div>
      )}
    </div>
  );
};
