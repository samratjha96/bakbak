/**
 * ABOUTME: Recording status and job tracking server functions
 * ABOUTME: Handles transcription job status polling and updates
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { transcribe } from "~/lib/transcribe";
import { updateRecordingTranscription } from "~/lib/functions/recordings/mutations/transcription";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";
import { romanizeTranscriptionText } from "~/lib/functions/shared/helpers";

export const getTranscriptionJobStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { recordingId: string }) => {
    return z
      .object({
        recordingId: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { recordingId } = data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    if (recording.transcriptionStatus === "COMPLETED") {
      return {
        transcriptionStatus: "COMPLETED",
        jobStatus: "COMPLETED",
        text: recording.transcriptionText,
        romanizedText: recording.transcription?.romanization,
        recordingId,
      };
    }

    // If we have a job ID and status is IN_PROGRESS, check AWS for completion
    if (recording.transcriptionUrl && recording.transcriptionStatus === "IN_PROGRESS") {
      try {
        const jobId = recording.transcriptionUrl;
        const awsStatus = await transcribe.getTranscriptionStatus(jobId);

        if (awsStatus.status === "COMPLETED") {
          // Get transcription result from AWS
          const transcriptionResult = await transcribe.getTranscriptionResult(jobId);
          const transcriptionText = transcriptionResult.text;

          // Romanize the transcription text
          const sourceLanguage = recording.language || "hi";
          const romanizedText = await romanizeTranscriptionText(transcriptionText, sourceLanguage);

          // Update database with transcription and romanization
          await updateRecordingTranscription({
            data: {
              id: recordingId,
              transcription: {
                text: transcriptionText,
                romanization: romanizedText,
                isComplete: true,
              },
            },
          });

          return {
            transcriptionStatus: "COMPLETED",
            jobStatus: "COMPLETED",
            text: transcriptionText,
            romanizedText: romanizedText,
            recordingId,
          };
        } else if (awsStatus.status === "FAILED") {
          // Update status to failed
          const { updateRecordingTranscriptionStatus } = await import("~/lib/functions/recordings/mutations/transcription");
          await updateRecordingTranscriptionStatus({
            data: {
              id: recordingId,
              status: "FAILED",
            },
          });

          return {
            transcriptionStatus: "FAILED",
            jobStatus: "FAILED",
            errorMessage: awsStatus.errorMessage,
            recordingId,
          };
        }
      } catch (error) {
        console.error("Error checking AWS transcription status:", error);
      }
    }

    if (!recording.transcriptionUrl) {
      return {
        transcriptionStatus: recording.transcriptionStatus,
        jobStatus: "NOT_FOUND",
        recordingId,
      };
    }

    return {
      transcriptionStatus: recording.transcriptionStatus,
      jobStatus: recording.transcriptionStatus,
      recordingId,
    };
  });