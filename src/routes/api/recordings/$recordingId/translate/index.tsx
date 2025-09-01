import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { fetchRecording, updateRecordingTranslation } from "~/lib/recordings";
import { translate } from "~/lib/translate";
import { normalizeTranslateLanguage } from "~/lib/languages";
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
const logger = createLogger("API.TranslateRoute");

// Create a server function to handle POST request for initiating translation
const initiateTranslation = createServerFn({ method: "POST" })
  .middleware([
    apiResponseMiddleware,
    methodGuardMiddleware(["POST"]),
    parseJsonBodyMiddleware,
  ])
  .validator(
    (params: { recordingId: string; targetLanguage?: string }) => params,
  )
  .handler(async ({ data }) => {
    const { recordingId, targetLanguage = "en" } = data;

    logger.info(
      `Processing translation request for recording ${recordingId} to language ${targetLanguage}`,
    );

    // Fetch the recording
    let recording;
    try {
      logger.debug(`Fetching recording with ID ${recordingId}`);
      recording = await fetchRecording({ data: recordingId });
      logger.debug(
        `Fetched recording: ${recording.id}, title: ${recording.title}`,
      );
    } catch (error: any) {
      logger.error(`Error fetching recording ${recordingId}:`, error);
      throw notFound();
    }

    // Check if there's a transcription to translate
    if (!recording.isTranscribed || !recording.transcriptionText) {
      logger.warn(`No transcription available for recording ${recordingId}`);
      return {
        status: 400,
        message: "No transcription available to translate",
      };
    }

    logger.info(`Transcription found, proceeding with translation`);

    // Perform real translation via AWS Translate
    let translatedText: string;
    try {
      const sourceLang = recording.language || "auto";
      translatedText = await translate.translateText(
        recording.transcriptionText,
        sourceLang,
        normalizeTranslateLanguage(targetLanguage || "en"),
      );
    } catch (error: any) {
      logger.error(`Error calling AWS Translate:`, error);
      return {
        status: 502,
        message: `Translation service error: ${error?.message || "Unknown error"}`,
      };
    }

    // Update the recording with the translation
    logger.debug(`Updating recording with translation`);
    let updatedRecording;
    try {
      updatedRecording = await updateRecordingTranslation({
        data: {
          id: recordingId,
          translationText: translatedText,
          translationLanguage: targetLanguage,
        },
      });
      logger.info(`Successfully updated recording with translation`);
    } catch (error: any) {
      logger.error(`Error updating translation:`, error);
      throw new Error(
        `Failed to update recording with translation: ${error.message}`,
      );
    }

    logger.info(`Returning successful response`);
    return {
      status: 200,
      message: "Translation initiated successfully",
      translationText: updatedRecording.translationText,
      translationLanguage: updatedRecording.translationLanguage,
      recordingId,
    };
  });

export const Route = createFileRoute("/api/recordings/$recordingId/translate/")(
  {
    validateParams: z.object({
      recordingId: z.string(),
    }),
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
        if (request.method === "POST") {
          // Parse body (we also parse in middleware within the server fn; harmless here)
          const body = await request.json().catch(() => ({}));
          const result = await initiateTranslation({
            data: {
              recordingId: params.recordingId,
              ...body,
            },
          });
          return apiSuccess(result);
        }
        return apiMethodNotAllowed(["POST"]);
      } catch (error) {
        if (error === notFound()) {
          logger.warn(`Recording not found: ${params.recordingId}`);
          return apiNotFound(`Recording not found: ${params.recordingId}`);
        }
        const { error: errorMessage, status } = handleApiError(
          error,
          `API.TranslateRoute(${params.recordingId})`,
        );
        return apiError(errorMessage, status);
      }
    },
  } as any,
);
