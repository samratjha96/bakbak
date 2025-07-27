import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  TranslateIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "~/components/ui/Icons";
import { TranslationStatus } from "./TranslationStatus";
import type { TranslationStatus as TStatus } from "./TranslationStatus";
import { updateRecordingTranslation } from "~/api/recordings";
import { translationDataQueryOptions } from "~/utils/dataAccess";
import { createLogger } from "~/utils/logger";
import { getErrorMessage } from "~/utils/errorHandling";

// Create component-specific logger
const logger = createLogger("TranslationAccordion");

interface TranslationAccordionProps {
  recordingId: string;
  initialTranslationText?: string;
  initialTranslationLanguage?: string;
  initialLastUpdated?: Date;
  initialStatus?: TStatus;
  className?: string;
}

/**
 * Component to display translation in an accordion view
 */
export const TranslationAccordion: React.FC<TranslationAccordionProps> = ({
  recordingId,
  initialTranslationText = "",
  initialTranslationLanguage = "",
  initialLastUpdated,
  initialStatus = "NOT_STARTED",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [translationText, setTranslationText] = useState(
    initialTranslationText,
  );
  const [translationLanguage, setTranslationLanguage] = useState(
    initialTranslationLanguage,
  );
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(
    initialLastUpdated,
  );
  const [status, setStatus] = useState<TStatus>(initialStatus);
  const queryClient = useQueryClient();

  // Fetch the current translation data using the targeted query function
  const {
    data: translationData,
    isLoading,
    error,
  } = useQuery({
    ...translationDataQueryOptions(recordingId),
    select: (data) => ({
      ...data,
      // Apply default values if needed
      translationText: data.translationText || initialTranslationText,
      translationLanguage:
        data.translationLanguage || initialTranslationLanguage,
      translationLastUpdated: data.translationLastUpdated || initialLastUpdated,
    }),
    // Only enable if we have a recording ID and the accordion is open
    enabled: !!recordingId && isOpen,
    onError: (err) => {
      logger.error(
        `Error fetching translation: ${getErrorMessage(err, `TranslationAccordion(${recordingId})`)}`,
      );
    },
  });

  // Use derived values from query data instead of separate state
  const displayTranslationText = useMemo(
    () => translationData?.translationText || initialTranslationText || "",
    [translationData?.translationText, initialTranslationText],
  );

  const displayTranslationLanguage = useMemo(
    () =>
      translationData?.translationLanguage || initialTranslationLanguage || "",
    [translationData?.translationLanguage, initialTranslationLanguage],
  );

  const displayLastUpdated = useMemo(
    () => translationData?.translationLastUpdated || initialLastUpdated,
    [translationData?.translationLastUpdated, initialLastUpdated],
  );

  const displayStatus = useMemo(
    () => (displayTranslationText ? "COMPLETED" : initialStatus),
    [displayTranslationText, initialStatus],
  );

  // Mutation to create translation using server function
  const createTranslationMutation = useMutation({
    mutationFn: async (targetLanguage: string = "en") => {
      logger.info(
        `Starting translation for recording ${recordingId} to language ${targetLanguage}`,
      );

      // Verify transcription exists by fetching basic recording data
      const recordingData = await queryClient.fetchQuery({
        queryKey: ["recording", recordingId],
        queryFn: () => queryClient.getQueryData(["recording", recordingId]),
      });

      if (!recordingData.isTranscribed || !recordingData.transcriptionText) {
        throw new Error("No transcription available to translate");
      }

      logger.info(
        `Found transcription, creating translation for ${recordingId}`,
      );

      // Create a simulated translation (in a real app, this would use a translation service)
      const translatedText = `${recordingData.transcriptionText}\n\n[Translated to ${targetLanguage}]`;

      // Use the server function to update the recording with translation
      const updatedRecording = await updateRecordingTranslation({
        data: {
          id: recordingId,
          translationText: translatedText,
          translationLanguage: targetLanguage,
        },
      });

      logger.info(`Translation successfully created for ${recordingId}`);

      // Return the updated translation data
      return {
        translationText: updatedRecording.translationText,
        translationLanguage: updatedRecording.translationLanguage,
        translationLastUpdated: updatedRecording.translationLastUpdated,
      };
    },
    onSuccess: () => {
      // Just invalidate queries - React Query will handle refetching
      queryClient.invalidateQueries({ queryKey: ["translation", recordingId] });
      queryClient.invalidateQueries({ queryKey: ["recording", recordingId] });
    },
    onError: (error) => {
      // Set status to failed
      setStatus("FAILED");
      logger.error(
        `Error creating translation: ${getErrorMessage(error, `TranslationAccordion.createTranslation(${recordingId})`)}`,
      );
    },
  });

  const handleTranslate = () => {
    setStatus("IN_PROGRESS");
    createTranslationMutation.mutate();
  };

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
    >
      {/* Accordion Header */}
      <button
        onClick={toggleAccordion}
        className="w-full flex justify-between items-center p-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
          <TranslateIcon className="w-5 h-5 text-primary dark:text-primary-light" />
          <span className="font-medium">Translation</span>
          {displayTranslationLanguage && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({displayTranslationLanguage})
            </span>
          )}
        </div>
        <div className="flex items-center">
          {/* Last updated timestamp if available */}
          {displayLastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-3">
              Updated {new Date(displayLastUpdated).toLocaleDateString()}
            </span>
          )}
          {/* Chevron icon */}
          {isOpen ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </button>

      {/* Accordion Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="p-4 bg-gray-50 dark:bg-gray-800">
          {/* Show translation status if in progress */}
          {status === "IN_PROGRESS" && (
            <TranslationStatus
              status={status}
              lastUpdated={displayLastUpdated}
              className="mb-4"
            />
          )}

          {/* If we're loading */}
          {isLoading && (
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading translation...
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          )}

          {/* If there was an error */}
          {error && !isLoading && (
            <div className="text-red-600 dark:text-red-400">
              Error loading translation:{" "}
              {error instanceof Error ? error.message : String(error)}
            </div>
          )}

          {/* If translation is in progress */}
          {createTranslationMutation.isPending && (
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Translation in progress...
              </p>
            </div>
          )}

          {/* If there's no translation yet */}
          {!isLoading &&
            !error &&
            !displayTranslationText &&
            !createTranslationMutation.isPending && (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No translation available. Click below to translate.
                </p>
                <button
                  onClick={handleTranslate}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary text-white rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto"
                  disabled={createTranslationMutation.isPending}
                >
                  <TranslateIcon className="w-5 h-5" />
                  <span>Translate</span>
                </button>
              </div>
            )}

          {/* If translation is available */}
          {!isLoading && !error && displayTranslationText && (
            <>
              {displayStatus === "COMPLETED" && (
                <TranslationStatus
                  status={displayStatus}
                  lastUpdated={displayLastUpdated}
                  className="mb-4"
                />
              )}
              <div className="whitespace-pre-wrap bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {displayTranslationText}
              </div>
            </>
          )}

          {/* Error message for translation mutation */}
          {createTranslationMutation.isError && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              Error creating translation:{" "}
              {createTranslationMutation.error instanceof Error
                ? createTranslationMutation.error.message
                : String(createTranslationMutation.error)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
