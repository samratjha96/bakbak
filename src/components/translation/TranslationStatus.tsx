import React from "react";
import { formatDateTime } from "~/utils/formatting";

export type TranslationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

interface TranslationStatusProps {
  status: TranslationStatus;
  lastUpdated?: Date;
  className?: string;
}

/**
 * Component to display the current translation status
 */
export const TranslationStatus: React.FC<TranslationStatusProps> = ({
  status,
  lastUpdated,
  className = "",
}) => {
  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
      case "IN_PROGRESS":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30";
      case "FAILED":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
      case "NOT_STARTED":
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800";
    }
  };

  // Get label text
  const getStatusLabel = () => {
    switch (status) {
      case "COMPLETED":
        return "Completed";
      case "IN_PROGRESS":
        return "In Progress";
      case "FAILED":
        return "Failed";
      case "NOT_STARTED":
      default:
        return "Not Started";
    }
  };

  // Format timestamp if available
  const formattedTime = lastUpdated
    ? formatDateTime(
        lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated),
      )
    : null;

  // Render loading animation for in-progress status
  const renderStatusIcon = () => {
    if (status === "IN_PROGRESS") {
      return (
        <div className="inline-block h-3 w-3 mr-2">
          <div className="h-full w-full rounded-full border-2 border-solid border-current border-r-transparent animate-spin"></div>
        </div>
      );
    } else if (status === "COMPLETED") {
      return (
        <svg
          className="inline-block h-3 w-3 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    } else if (status === "FAILED") {
      return (
        <svg
          className="inline-block h-3 w-3 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    }
    return (
      <div className="inline-block h-3 w-3 mr-2 border border-current rounded-full"></div>
    );
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
      >
        {renderStatusIcon()}
        {getStatusLabel()}
      </div>
      {formattedTime && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Last updated: {formattedTime}
        </span>
      )}
    </div>
  );
};
