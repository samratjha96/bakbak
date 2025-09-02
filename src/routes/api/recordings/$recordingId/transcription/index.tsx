import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { fetchRecording, updateRecordingTranscription } from "~/lib/recordings";
import { z } from "zod";
import { apiSuccess, apiError, apiNotFound } from "~/utils/apiResponse";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import {
  apiResponseMiddleware,
  methodGuardMiddleware,
  parseJsonBodyMiddleware,
} from "~/middleware/apiMiddleware";
import { transcribe } from "~/lib/transcribe";

const logger = createLogger("API.TranscriptionRoute");

// Create a server function to handle GET request for transcription
const getTranscription = createServerFn({ method: "GET" })
  .middleware([apiResponseMiddleware, methodGuardMiddleware(["GET"])])
  .validator((params: { recordingId: string }) => params)
  .handler(async ({ data: { recordingId } }) => {
    // Fetch the recording
    let recording;
    try {
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      throw notFound();
    }

    // Check if the recording has a transcription
    if (
      !recording.isTranscribed ||
      recording.transcriptionStatus !== "COMPLETED"
    ) {
      return {
        status: 404,
        message: "No completed transcription found for this recording",
      };
    }

    // If we have a job ID, fetch the detailed transcription result
    let transcriptionResult: { text: string; items?: any[] } | null = null;
    if (recording.transcriptionUrl) {
      try {
        const jobId = recording.transcriptionUrl.split("/").pop() || "";
        transcriptionResult = await transcribe.getTranscriptionResult(jobId);
      } catch (error) {
        console.error("Error fetching detailed transcription result:", error);
        // We'll continue with the basic transcription stored in the recording
      }
    }

    return {
      status: 200,
      transcription: recording.transcription,
      transcriptionText: recording.transcriptionText,
      transcriptionLastUpdated: recording.transcriptionLastUpdated,
      detailedResult: transcriptionResult,
      recordingId,
    };
  });

// Create a server function to handle PUT request for updating transcription
const updateTranscription = createServerFn({ method: "POST" })
  .middleware([
    apiResponseMiddleware,
    methodGuardMiddleware(["POST"]),
    parseJsonBodyMiddleware,
  ])
  .validator(
    (params: {
      recordingId: string;
      text?: string;
      isComplete?: boolean;
      romanization?: string;
    }) => params,
  )
  .handler(async ({ data }) => {
    const { recordingId, text, isComplete, romanization } = data;

    // Fetch the recording
    let recording;
    try {
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      throw notFound();
    }

    // Update the transcription
    const updatedRecording = await updateRecordingTranscription({
      data: {
        id: recordingId,
        transcription: {
          text: text || recording.transcriptionText || "",
          romanization:
            romanization || recording.transcription?.romanization || "",
          isComplete:
            isComplete !== undefined ? isComplete : recording.isTranscribed,
        },
      },
    });

    return {
      status: 200,
      message: "Transcription updated successfully",
      transcription: updatedRecording.transcription,
      recordingId,
    };
  });

export const Route = createFileRoute(
  "/api/recordings/$recordingId/transcription/",
)({
  loaderDeps: ({ params }: { params: { recordingId: string } }) => ({
    recordingId: params.recordingId,
  }),
  serverComponent: async ({
    params,
    deps,
    request,
  }: {
    params: { recordingId: string };
    deps: { recordingId: string };
    request: Request;
  }) => {
    logger.info(`Request received: ${request.method} ${request.url}`);

    if (params.recordingId !== deps.recordingId) {
      logger.error(
        `Parameter mismatch: params=${params.recordingId}, deps=${deps.recordingId}`,
      );
      return apiError("recordingId mismatch", 400);
    }

    try {
      if (request.method === "GET") {
        logger.info(
          `Processing GET request for recording ${params.recordingId}`,
        );
        const result = await getTranscription({
          data: {
            recordingId: params.recordingId,
          },
        });
        return apiSuccess(result);
      } else if (request.method === "POST") {
        logger.info(
          `Processing POST request for recording ${params.recordingId}`,
        );
        const body = await request.json().catch(() => ({}));
        const result = await updateTranscription({
          data: {
            recordingId: params.recordingId,
            ...body,
          },
        });
        return apiSuccess(result);
      } else {
        logger.warn(`Method not allowed: ${request.method}`);
        return apiError("Method not allowed", 405, { Allow: "GET, POST" });
      }
    } catch (error) {
      logger.error(`Error processing request:`, error);
      if (error === notFound()) {
        logger.warn(`Recording not found: ${params.recordingId}`);
        return apiNotFound(`Recording not found: ${params.recordingId}`);
      }
      const { error: errorMessage, status } = handleApiError(
        error,
        `API.TranscriptionRoute(${params.recordingId})`,
      );
      return apiError(errorMessage, status);
    }
  },
} as any);
