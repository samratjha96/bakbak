import { Recording } from "~/types/recording";

/**
 * Format a duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
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
 * Get total practice time from recordings in hours
 */
export const getTotalPracticeTime = (recordings: Recording[]): string => {
  const totalSeconds = recordings.reduce((acc, r) => acc + r.duration, 0);
  const totalHours = totalSeconds / 3600;
  return `${Math.round(totalHours * 10) / 10}h`;
};

/**
 * Count the number of unique languages in recordings
 */
export const getUniqueLanguagesCount = (recordings: Recording[]): number => {
  return new Set(recordings.map((r) => r.language).filter(Boolean)).size;
};

/**
 * Get the number of recordings created in the last week
 */
export const getRecordingsThisWeek = (recordings: Recording[]): number => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return recordings.filter((r) => r.createdAt > weekAgo).length;
};
