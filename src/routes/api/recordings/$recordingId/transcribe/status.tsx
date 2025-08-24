import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { fetchRecording, updateRecordingTranscriptionStatus } from "~/data/recordings";
import { z } from "zod";
import { transcribe } from "~/lib/transcribe";
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiBadRequest,
} from "~/utils/apiResponse";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import {
  apiResponseMiddleware,
  methodGuardMiddleware,
} from "~/middleware/apiMiddleware";

// Create a logger for this API route
const logger = createLogger("API.TranscribeStatusRoute");

// Create a server function to handle the transcription status request
const getTranscriptionStatus = createServerFn({ method: "GET" })
  .middleware([apiResponseMiddleware, methodGuardMiddleware(["GET"])])
  .validator((params: { recordingId: string }) => params)
  .handler(async ({ data: { recordingId } }) => {
    // Fetch the recording
    let recording;
    try {
      logger.info(`Getting transcription status for recording ${recordingId}`);
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      logger.error(`Recording not found: ${recordingId}`);
      throw notFound();
    }

    // Check if we have a transcription job ID
    if (!recording.transcriptionUrl) {
      logger.warn(`No transcription job found for recording ${recordingId}`);
      return {
        status: 400,
        message: "No transcription job found for this recording",
      };
    }

    // The jobId is stored directly in the transcriptionUrl field
    const jobId = recording.transcriptionUrl;

    try {
      // Get the transcription status from AWS Transcribe
      const status = await transcribe.getTranscriptionStatus(jobId);
      
      // Check if the job is completed
      if (status.status === "COMPLETED") {
        logger.info(`Transcription completed for recording ${recordingId}`);
        
        // Get the transcription result
        const result = await transcribe.getTranscriptionResult(jobId);
        
        // Update the recording with the transcription text
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
      
      // Check if the job failed
      if (status.status === "FAILED") {
        logger.error(`Transcription failed for recording ${recordingId}: ${status.errorMessage}`);
        
        // Update the recording status to FAILED
        await updateRecordingTranscriptionStatus({
          data: {
            id: recordingId,
            status: "FAILED",
          },
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
      logger.error(`Error checking transcription status: ${error}`);
      return {
        status: 500,
        transcriptionStatus: recording.transcriptionStatus,
        jobStatus: "ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
        recordingId,
        requestedAt: new Date().toISOString(),
      };
    }
  });

export const Route = createFileRoute(
  "/api/recordings/$recordingId/transcribe/status",
)({
  loaderDeps: (ctx: any) => ({ recordingId: ctx?.params?.recordingId }),
  serverComponent: async ({ params, deps, request }: any) => {
    logger.info(`Request received: ${request.method} ${request.url}`);

    if (params.recordingId !== deps.recordingId) {
      logger.error(
        `Parameter mismatch: params=${params.recordingId}, deps=${deps.recordingId}`,
      );
      return apiError("recordingId mismatch", 400);
    }

    try {
      logger.info(`Getting status for recording ${params.recordingId}`);
      const result = await getTranscriptionStatus({
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
        `API.TranscribeStatusRoute(${params.recordingId})`,
      );
      return apiError(errorMessage, status);
    }
  },
} as any);
