import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DocumentIcon } from "~/components/ui/Icons";
import { startTranscriptionJob } from "~/server/transcribe-jobs";
import { transcriptionStatusQuery } from "~/lib/recordings";
import { useQueryInvalidator } from "~/lib/queryInvalidation";
import { queryKeys } from "~/lib/queryKeys";

interface TranscribeButtonProps {
  recordingId: string;
  disabled?: boolean;
  onTranscriptionStarted?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  currentStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

/**
 * Button to initiate transcription for a recording
 */
export const TranscribeButton: React.FC<TranscribeButtonProps> = ({
  recordingId,
  disabled = false,
  onTranscriptionStarted,
  className = "",
  variant = "primary",
  size = "md",
  currentStatus = "NOT_STARTED",
}) => {
  const queryClient = useQueryClient();
  const invalidator = useQueryInvalidator();
  const [isStarting, setIsStarting] = useState(false);

  // Bind the server function
  const boundStartTranscription = useServerFn(startTranscriptionJob);

  // Poll transcription status if in progress
  const { data: statusData } = useQuery({
    ...transcriptionStatusQuery(recordingId),
    enabled: currentStatus === "IN_PROGRESS" || isStarting,
  });

  // Mutation to start transcription
  const transcribeMutation = useMutation({
    mutationFn: () => boundStartTranscription({ data: { recordingId } }),
    onMutate: async () => {
      setIsStarting(true);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recordings.detail(recordingId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.transcriptions.status(recordingId) });
      
      // Snapshot the previous values
      const previousRecording = queryClient.getQueryData(queryKeys.recordings.detail(recordingId));
      const previousStatus = queryClient.getQueryData(queryKeys.transcriptions.status(recordingId));
      
      // Optimistically update recording status
      queryClient.setQueryData(queryKeys.recordings.detail(recordingId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          transcriptionStatus: "IN_PROGRESS",
          isTranscribed: false,
        };
      });
      
      // Optimistically update transcription status query
      queryClient.setQueryData(queryKeys.transcriptions.status(recordingId), (old: any) => ({
        ...old,
        transcriptionStatus: "IN_PROGRESS",
      }));
      
      // Also update recordings list cache if it exists
      queryClient.setQueryData(queryKeys.recordings.lists(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((r: any) => 
          r.id === recordingId 
            ? { 
                ...r, 
                transcriptionStatus: "IN_PROGRESS",
                isTranscribed: false,
              }
            : r
        );
      });
      
      return { previousRecording, previousStatus };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousRecording) {
        queryClient.setQueryData(queryKeys.recordings.detail(recordingId), context.previousRecording);
      }
      if (context?.previousStatus) {
        queryClient.setQueryData(queryKeys.transcriptions.status(recordingId), context.previousStatus);
      }
    },
    onSuccess: () => {
      // Use standardized invalidation for transcription start
      invalidator.transcription.afterStart(recordingId);

      // Call the callback if provided
      if (onTranscriptionStarted) {
        onTranscriptionStarted();
      }
    },
    onSettled: () => {
      setIsStarting(false);
      // Always refetch to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.recordings.detail(recordingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transcriptions.status(recordingId) });
    },
  });

  // Determine the actual status (from polling or props)
  const actualStatus = statusData?.transcriptionStatus || currentStatus;
  const isInProgress = actualStatus === "IN_PROGRESS" || isStarting;

  // Hide button when transcription is in progress (but show while starting)
  if (isInProgress && !isStarting) {
    return null;
  }

  // Button variant styles
  const variantStyles = {
    primary: "bg-primary text-white hover:bg-secondary",
    secondary:
      "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600",
    outline:
      "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
  };

  // Button size styles
  const sizeStyles = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-5 py-2.5 text-lg",
  };

  const handleClick = () => {
    if (!disabled && !isInProgress) {
      transcribeMutation.mutate();
    }
  };

  // Get appropriate button text and icon
  const getButtonContent = () => {
    if (isStarting) {
      return (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
          <span>Starting...</span>
        </>
      );
    }

    return (
      <>
        <DocumentIcon className="w-5 h-5" />
        <span>Transcribe</span>
      </>
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isInProgress}
      className={`
        ${variantStyles[variant]} 
        ${sizeStyles[size]} 
        rounded flex items-center justify-center gap-2 transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${isInProgress ? "opacity-70" : ""}
        ${className}
      `}
    >
      {getButtonContent()}
    </button>
  );
};
