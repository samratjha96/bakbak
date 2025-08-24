import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DocumentIcon } from "~/components/ui/Icons";
import { startTranscriptionJob } from "~/server/transcribe-jobs";
import { transcriptionStatusQuery } from "~/data/recordings";

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
    onSuccess: () => {
      // Invalidate the recording query to refresh data
      queryClient.invalidateQueries({ queryKey: ["recording", recordingId] });
      
      // Start polling for status updates
      queryClient.invalidateQueries({ queryKey: ["transcription", "status", recordingId] });
      
      // Call the callback if provided
      if (onTranscriptionStarted) {
        onTranscriptionStarted();
      }
    },
    onMutate: () => setIsStarting(true),
    onSettled: () => setIsStarting(false),
  });

  // Determine the actual status (from polling or props)
  const actualStatus = statusData?.transcriptionStatus || currentStatus;
  const isInProgress = actualStatus === "IN_PROGRESS" || isStarting;

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
    
    if (isInProgress) {
      return (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
          <span>Processing</span>
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
