import { Recording } from "~/types/recording";

/**
 * Format a duration in seconds to MM:SS format
 * Handles edge cases for invalid or negative numbers
 */
export const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return "00:00";

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

/**
 * Format a date relative to now (Today, Yesterday, X days ago, or full date)
 */
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

/**
 * Format a date string to a localized short format (MMM DD, YYYY)
 */
export const formatDate = (dateString: string | Date): string => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format a date string to a localized long format (Month DD, YYYY)
 */
export const formatDateLong = (dateString: string | Date): string => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format a timestamp to include date and time
 */
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};
