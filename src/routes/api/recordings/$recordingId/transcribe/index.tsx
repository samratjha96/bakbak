import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  fetchRecording,
  updateRecordingTranscriptionStatus,
  getRecordingPresignedUrl,
} from "~/data/recordings";
import { z } from "zod";
import { apiSuccess, apiError, apiNotFound } from "~/utils/apiResponse";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import {
  apiResponseMiddleware,
  methodGuardMiddleware,
} from "~/middleware/apiMiddleware";
import { transcribe } from "~/lib/transcribe";

// Create a logger for this API route
const logger = createLogger("API.TranscribeRoute");

// Create a server function to handle the transcription request
const startTranscription = createServerFn({ method: "POST" })
  .middleware([apiResponseMiddleware, methodGuardMiddleware(["POST"])])
  .validator(
    (params: { recordingId: string; target_language?: string }) => params,
  )
  .handler(async ({ data: { recordingId, target_language } }) => {
    // Fetch the recording
    let recording;
    try {
      logger.info(`Starting transcription for recording ${recordingId}`);
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      logger.error(`Recording not found: ${recordingId}`);
      throw notFound();
    }

    // Check if we already have a transcription in progress
    if (recording.transcriptionStatus === "IN_PROGRESS") {
      logger.warn(
        `Transcription already in progress for recording ${recordingId}`,
      );
      return {
        status: 409,
        message: "Transcription already in progress",
      };
    }

    // Update the transcription status to IN_PROGRESS
    await updateRecordingTranscriptionStatus({
      data: {
        id: recordingId,
        status: "IN_PROGRESS",
      },
    });

    try {
      // Get a presigned URL for the audio file
      const { url: audioUrl } = await getRecordingPresignedUrl({ data: recordingId });
      
      // Get language code from the recording
      const languageCode = recording.language || "en";

      // Start a transcription job with AWS Transcribe
      const jobId = await transcribe.startTranscription(
        recordingId,
        audioUrl,
        languageCode
      );
      
      logger.info(
        `Transcription job started with ID: ${jobId} for recording ${recordingId}`,
      );

      // Update the transcription job URL in the database
      await updateRecordingTranscriptionStatus({
        data: {
          id: recordingId,
          status: "IN_PROGRESS",
          transcriptionUrl: jobId, // Store the job ID in the transcriptionUrl field
        },
      });

      return {
        status: 202,
        message: "Transcription process started",
        recordingId,
        jobId,
        requestedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(
        `Error starting transcription for recording ${recordingId}: ${error}`,
      );
      
      // Update status to FAILED if there was an error
      await updateRecordingTranscriptionStatus({
        data: {
          id: recordingId,
          status: "FAILED",
        },
      });
      
      throw new Error(
        `Failed to start transcription: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

export const Route = createFileRoute(
  "/api/recordings/$recordingId/transcribe/",
)({
  validateParams: z.object({
    recordingId: z.string(),
  }),
  loaderDeps: ({ params: { recordingId } }) => ({
    recordingId,
  }),
  serverComponent: async ({ params, deps, request }) => {
    logger.info(`Request received: ${request.method} ${request.url}`);
    
    // Debug AWS environment variables
    console.log('AWS Environment Variables:', {
      AWS_REGION: process.env.AWS_REGION,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '***' : undefined,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '***' : undefined,
    });

    if (params.recordingId !== deps.recordingId) {
      logger.error(
        `Parameter mismatch: params=${params.recordingId}, deps=${deps.recordingId}`,
      );
      return apiError("recordingId mismatch", 400);
    }

    try {
      logger.info(`Processing request for recording ${params.recordingId}`);
      const result = await startTranscription({
        data: {
          recordingId: params.recordingId,
        },
      });

      return apiSuccess(result);
    } catch (error) {
      if (error === notFound()) {
        logger.warn(`Recording not found: ${params.recordingId}`);
        return apiNotFound(`Recording not found: ${params.recordingId}`);
      }

      const { error: errorMessage, status } = handleApiError(
        error,
        `API.TranscribeRoute(${params.recordingId})`,
      );
      return apiError(errorMessage, status);
    }
  },
});
