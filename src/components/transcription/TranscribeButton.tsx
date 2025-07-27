import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentIcon } from "~/components/ui/Icons";
import { Recording } from "~/types/recording";

interface TranscribeButtonProps {
  recordingId: string;
  disabled?: boolean;
  onTranscriptionStarted?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
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
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Mutation to start transcription
  const transcribeMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const response = await fetch(
        `/api/recordings/${recordingId}/transcribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start transcription");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the recording query to refresh data
      queryClient.invalidateQueries({ queryKey: ["recording", recordingId] });

      // Call the callback if provided
      if (onTranscriptionStarted) {
        onTranscriptionStarted();
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

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
    if (!disabled && !isLoading) {
      transcribeMutation.mutate();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        ${variantStyles[variant]} 
        ${sizeStyles[size]} 
        rounded flex items-center justify-center gap-2 transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${isLoading ? "opacity-70" : ""}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <DocumentIcon className="w-5 h-5" />
          <span>Transcribe</span>
        </>
      )}
    </button>
  );
};
