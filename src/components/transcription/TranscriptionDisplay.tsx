import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { EditIcon, SaveIcon } from "~/components/ui/Icons";
import { TranscriptionStatus } from "./TranscriptionStatus";
import { TranscriptionStatus as TStatus } from "~/types/recording";
import { updateRecordingTranscription } from "~/api/recordings";
import { transcriptionDataQueryOptions } from "~/utils/dataAccess";
import { createLogger } from "~/utils/logger";
import { getErrorMessage } from "~/utils/errorHandling";

// Create component-specific logger
const logger = createLogger("TranscriptionDisplay");

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
  const [status, setStatus] = useState<TStatus>(initialStatus);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(
    initialLastUpdated,
  );
  const queryClient = useQueryClient();

  // Fetch the current transcription data using the targeted query function
  const {
    data: transcriptionData,
    isLoading,
    error,
  } = useQuery({
    ...transcriptionDataQueryOptions(recordingId),
    select: (data) => ({
      ...data,
      // Apply default values if needed
      transcriptionText: data.transcriptionText || initialTranscriptionText,
      transcriptionStatus: data.transcriptionStatus || initialStatus,
      transcriptionLastUpdated:
        data.transcriptionLastUpdated || initialLastUpdated,
    }),
    // Only enable if we have a recording ID
    enabled: !!recordingId,
    onError: (err) => {
      logger.error(
        `Error fetching transcription: ${getErrorMessage(err, `TranscriptionDisplay(${recordingId})`)}`,
      );
    },
  });

  // Use derived values from query data instead of separate state
  const displayTranscriptionText = useMemo(
    () =>
      transcriptionData?.transcriptionText || initialTranscriptionText || "",
    [transcriptionData?.transcriptionText, initialTranscriptionText],
  );

  const displayStatus = useMemo(
    () => transcriptionData?.transcriptionStatus || initialStatus,
    [transcriptionData?.transcriptionStatus, initialStatus],
  );

  const displayLastUpdated = useMemo(
    () => transcriptionData?.transcriptionLastUpdated || initialLastUpdated,
    [transcriptionData?.transcriptionLastUpdated, initialLastUpdated],
  );

  // Mutation to update transcription using server function
  const updateTranscriptionMutation = useMutation({
    mutationFn: async (newText: string) => {
      logger.info(`Updating transcription for recording ${recordingId}`);

      // Use the server function to update the recording's transcription
      const updatedRecording = await updateRecordingTranscription({
        data: {
          id: recordingId,
          transcription: {
            text: newText,
            isComplete: true,
          },
        },
      });

      logger.info(`Successfully updated transcription for ${recordingId}`);

      return {
        transcriptionText: updatedRecording.transcriptionText,
        transcriptionStatus: updatedRecording.transcriptionStatus,
        transcriptionLastUpdated: updatedRecording.transcriptionLastUpdated,
      };
    },
    onError: (error) => {
      logger.error(
        `Error updating transcription: ${getErrorMessage(error, `TranscriptionDisplay.updateTranscription(${recordingId})`)}`,
      );
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
              isEditing ? handleSaveTranscription() : setIsEditing(true)
            }
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors"
            disabled={updateTranscriptionMutation.isPending}
          >
            {isEditing ? (
              <>
                <SaveIcon className="w-4 h-4" />
                <span>Save</span>
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
        <div className="relative">
          <textarea
            value={transcriptionText}
            onChange={(e) => setTranscriptionText(e.target.value)}
            className="w-full min-h-[200px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)]"
            placeholder="Enter or edit transcription text..."
          />
          {updateTranscriptionMutation.isPending && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="whitespace-pre-wrap bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          {displayTranscriptionText || "No transcription content available."}
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
