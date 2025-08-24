/**
 * Server functions for managing transcription jobs
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { transcribe } from "~/lib/transcribe";
import {
  fetchRecording,
  updateRecordingTranscriptionStatus,
  getRecordingPath,
} from "~/data/recordings";
import { AppError } from "~/utils/errorHandling";
import { TranscriptionStatus } from "~/types/recording";

// Response type for start transcription
export interface StartTranscriptionResponse {
  status: number;
  message: string;
  recordingId: string;
  jobId?: string;
  requestedAt: string;
}

// Response type for checking transcription status
export interface TranscriptionStatusResponse {
  status: number;
  transcriptionStatus: TranscriptionStatus;
  jobStatus: string;
  errorMessage?: string;
  text?: string;
  recordingId: string;
  requestedAt: string;
}

/**
 * Start a transcription job
 */
export const startTranscriptionJob = createServerFn({ method: "POST" })
  .validator(
    (params: { recordingId: string; target_language?: string }) => params,
  )
  .handler(
    async ({
      data: { recordingId, target_language },
    }): Promise<StartTranscriptionResponse> => {
      // Fetch the recording
      let recording;
      try {
        recording = await fetchRecording({ data: recordingId });
      } catch (error) {
        throw notFound();
      }

      // Check if transcription is already in progress
      if (recording.transcriptionStatus === "IN_PROGRESS") {
        return {
          status: 409,
          message: "Transcription already in progress",
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }

      // Update status to IN_PROGRESS
      await updateRecordingTranscriptionStatus({
        data: { id: recordingId, status: "IN_PROGRESS" },
      });

      try {
        // Get S3 URI and start transcription
        const { s3Uri } = await getRecordingPath({ data: recordingId });
        const languageCode = recording.language || "en";
        const jobId = await transcribe.startTranscription(
          recordingId,
          s3Uri,
          languageCode,
        );

        // Update with job ID
        await updateRecordingTranscriptionStatus({
          data: {
            id: recordingId,
            status: "IN_PROGRESS",
            jobId: jobId,
          },
        });

        return {
          status: 202,
          message: "Transcription started",
          recordingId,
          jobId,
          requestedAt: new Date().toISOString(),
        };
      } catch (error) {
        // Update to FAILED status
        await updateRecordingTranscriptionStatus({
          data: { id: recordingId, status: "FAILED" },
        });

        throw new AppError(
          `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
        );
      }
    },
  );

/**
 * Get transcription job status
 */
export const getTranscriptionJobStatus = createServerFn({ method: "GET" })
  .validator((params: { recordingId: string }) => params)
  .handler(
    async ({ data: { recordingId } }): Promise<TranscriptionStatusResponse> => {
      // Fetch the recording
      let recording;
      try {
        recording = await fetchRecording({ data: recordingId });
      } catch (error) {
        throw notFound();
      }

      // Check for job ID
      if (!recording.transcriptionUrl) {
        return {
          status: 400,
          transcriptionStatus: recording.transcriptionStatus,
          jobStatus: "NOT_FOUND",
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }

      const jobId = recording.transcriptionUrl;

      try {
        const status = await transcribe.getTranscriptionStatus(jobId);

        // Handle completed job
        if (status.status === "COMPLETED") {
          const result = await transcribe.getTranscriptionResult(jobId);
          await updateRecordingTranscriptionStatus({
            data: {
              id: recordingId,
              status: "COMPLETED",
              transcriptionText: result.text,
            },
          });

          return {
            status: 200,
            transcriptionStatus: "COMPLETED",
            jobStatus: status.status,
            text: result.text,
            recordingId,
            requestedAt: new Date().toISOString(),
          };
        }

        // Handle failed job
        if (status.status === "FAILED") {
          await updateRecordingTranscriptionStatus({
            data: { id: recordingId, status: "FAILED" },
          });
        }

        return {
          status: 200,
          transcriptionStatus: recording.transcriptionStatus,
          jobStatus: status.status,
          errorMessage: status.errorMessage,
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      } catch (error) {
        // Don't update the recording status on error checking status
        return {
          status: 500,
          transcriptionStatus: recording.transcriptionStatus,
          jobStatus: "ERROR",
          errorMessage: error instanceof Error ? error.message : String(error),
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }
    },
  );
