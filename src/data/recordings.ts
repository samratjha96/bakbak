/**
 * Client-safe recordings data layer
 * NO database imports - only query options and type definitions
 */
import { queryOptions } from "@tanstack/react-query";

// Import server functions (safe - function references only)
import {
  fetchRecordings,
  fetchRecording,
  createRecording,
  updateRecordingTranscription,
  updateRecordingNotes,
  updateRecordingTranscriptionStatus,
  updateRecordingTranslation,
  updateRecording,
  getRecordingPresignedUrl,
  getRecordingPath,
  deleteRecording,
} from "~/server/recordings";
import { getTranscriptionJobStatus } from "~/server/transcribe-jobs";

// Query options for React Query - CLIENT SAFE
export const recordingsQuery = () =>
  queryOptions({
    queryKey: ["recordings"],
    queryFn: () => fetchRecordings(),
  });

export const recordingQuery = (id: string) =>
  queryOptions({
    queryKey: ["recording", id],
    queryFn: () => fetchRecording({ data: id }),
  });

// Re-export server functions for convenience
export {
  fetchRecordings,
  fetchRecording,
  createRecording,
  updateRecordingTranscription,
  updateRecordingNotes,
  updateRecordingTranscriptionStatus,
  updateRecordingTranslation,
  updateRecording,
  getRecordingPresignedUrl,
  getRecordingPath,
  deleteRecording,
  getTranscriptionJobStatus,
}; 

// Query options for fetching presigned URL with caching
export const presignedUrlQuery = (id: string) =>
  queryOptions({
    queryKey: ["recording", id, "presignedUrl"],
    queryFn: () => getRecordingPresignedUrl({ data: id }),
    // Cache for 10 minutes (presigned URLs expire after 15 minutes)
    gcTime: 1000 * 60 * 10,
    staleTime: 1000 * 60 * 10,
  });

// Query options for polling transcription job status
export const transcriptionStatusQuery = (recordingId: string) =>
  queryOptions({
    queryKey: ["transcription", "status", recordingId],
    queryFn: () => getTranscriptionJobStatus({ data: { recordingId } }),
    refetchInterval: (data) => {
      // Stop polling when transcription is complete or failed
      const status = (data as any)?.transcriptionStatus;
      if (status === "COMPLETED" || status === "FAILED") {
        return false;
      }
      // Poll every 3 seconds while in progress
      return 3000;
    },
    // Only enable if we have a recording ID
    enabled: !!recordingId,
  });