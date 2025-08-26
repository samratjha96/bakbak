import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { fetchRecording, updateRecordingTranslation } from "~/lib/recordings";
import { z } from "zod";
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiMethodNotAllowed,
} from "~/utils/apiResponse";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import {
  apiResponseMiddleware,
  methodGuardMiddleware,
  parseJsonBodyMiddleware,
} from "~/middleware/apiMiddleware";

// Create a logger for this API route
const logger = createLogger("API.TranslationRoute");

// Create a server function to handle GET request for translation
const getTranslation = createServerFn({ method: "GET" })
  .middleware([apiResponseMiddleware, methodGuardMiddleware(["GET"])])
  .validator((params: { recordingId: string }) => params)
  .handler(async ({ data: { recordingId } }) => {
    // Fetch the recording
    let recording;
    try {
      logger.info(`Getting translation for recording ${recordingId}`);
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      logger.error(`Recording not found: ${recordingId}`);
      throw notFound();
    }

    // Check if the recording has a translation
    if (!recording.isTranslated || !recording.translationText) {
      return {
        status: 404,
        message: "No translation found for this recording",
      };
    }

    return {
      status: 200,
      translationText: recording.translationText,
      translationLanguage: recording.translationLanguage,
      translationLastUpdated: recording.translationLastUpdated,
      translationUrl: recording.translationUrl,
      recordingId,
    };
  });

// Create a server function to handle POST request for creating translation
const createTranslation = createServerFn({ method: "POST" })
  .middleware([
    apiResponseMiddleware,
    methodGuardMiddleware(["POST"]),
    parseJsonBodyMiddleware,
  ])
  .validator(
    (params: {
      recordingId: string;
      translationText: string;
      translationLanguage: string;
      translationUrl?: string;
    }) => params,
  )
  .handler(async ({ data }) => {
    const {
      recordingId,
      translationText,
      translationLanguage,
      translationUrl,
    } = data;

    // Fetch the recording
    try {
      logger.info(`Creating translation for recording ${recordingId}`);
      await fetchRecording({ data: recordingId });
    } catch (error) {
      logger.error(`Recording not found: ${recordingId}`);
      throw notFound();
    }

    // Check if there's a transcription to translate
    // In a real application, you might want to prevent translation if there's no transcription

    // Update the translation
    const updatedRecording = await updateRecordingTranslation({
      data: {
        id: recordingId,
        translationText,
        translationLanguage,
        translationUrl,
      },
    });

    return {
      status: 200,
      message: "Translation created successfully",
      translationText: updatedRecording.translationText,
      translationLanguage: updatedRecording.translationLanguage,
      recordingId,
    };
  });

export const Route = createFileRoute(
  "/api/recordings/$recordingId/translation/",
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
      // Handle different HTTP methods
      if (request.method === "GET") {
        logger.info(
          `Processing GET request for recording ${params.recordingId}`,
        );
        const result = await getTranslation({
          data: {
            recordingId: params.recordingId,
          },
        });
        return apiSuccess(result);
      } else if (request.method === "POST") {
        logger.info(
          `Processing POST request for recording ${params.recordingId}`,
        );
        // Parse the request body for POST
        let body;
        try {
          body = await request.json();
          logger.debug(`Request body:`, body);
        } catch (parseError) {
          logger.error(`Error parsing request body:`, parseError);
          return apiError("Invalid JSON in request body", 400);
        }

        const result = await createTranslation({
          data: {
            recordingId: params.recordingId,
            ...body,
          },
        });
        return apiSuccess(result);
      } else {
        logger.warn(`Method not allowed: ${request.method}`);
        return apiMethodNotAllowed(["GET", "POST"]);
      }
    } catch (error) {
      if (error === notFound()) {
        logger.warn(`Recording not found: ${params.recordingId}`);
        return apiNotFound(`Recording not found: ${params.recordingId}`);
      }

      const { error: errorMessage, status } = handleApiError(
        error,
        `API.TranslationRoute(${params.recordingId})`,
      );
      return apiError(errorMessage, status);
    }
  },
} as any);
