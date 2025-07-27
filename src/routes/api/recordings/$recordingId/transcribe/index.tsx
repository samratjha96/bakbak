import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  fetchRecording,
  updateRecordingTranscriptionStatus,
} from "~/utils/recordings";
import { z } from "zod";
import { apiSuccess, apiError, apiNotFound } from "~/utils/apiResponse";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import {
  apiResponseMiddleware,
  methodGuardMiddleware,
  validateParamsMiddleware,
} from "~/middleware/apiMiddleware";

// Create a logger for this API route
const logger = createLogger("API.TranscribeRoute");

// Create a server function to handle the transcription request
const startTranscription = createServerFn({ method: "POST" })
  .validator(
    (params: { recordingId: string; target_language?: string }) => params,
  )
  // Apply middleware for consistent API responses
  .use(apiResponseMiddleware)
  .use(methodGuardMiddleware(["POST"]))
  .use(validateParamsMiddleware)
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

    // Update the transcription status
    await updateRecordingTranscriptionStatus({
      data: {
        id: recordingId,
        status: "IN_PROGRESS",
      },
    });

    // In a real implementation, we would start an async transcription process here
    // For now, we'll simulate with a mock response

    return {
      status: 202,
      message: "Transcription process started",
      recordingId,
      requestedAt: new Date().toISOString(),
    };
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
