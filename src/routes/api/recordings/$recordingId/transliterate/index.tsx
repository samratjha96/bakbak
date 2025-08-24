import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { fetchRecording } from "~/data/recordings";
import { apiSuccess, apiError, apiNotFound, apiMethodNotAllowed } from "~/utils/apiResponse";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import { apiResponseMiddleware, methodGuardMiddleware, parseJsonBodyMiddleware } from "~/middleware/apiMiddleware";
import { transliterateText } from "~/lib/transliterate";
import { getDefaultScriptForLanguage, isSupportedTranslateLanguage } from "~/lib/languages";

const logger = createLogger("API.TransliterateRoute");

const postTransliterate = createServerFn({ method: "POST" })
  .middleware([
    apiResponseMiddleware,
    methodGuardMiddleware(["POST"]),
    parseJsonBodyMiddleware,
  ])
  .validator(
    (params: {
      recordingId: string;
      languageCode?: string;
      sourceScriptCode?: string;
      targetScriptCode?: string;
    }) => params,
  )
  .handler(async ({ data }) => {
    const { recordingId } = data;
    const languageCode = data.languageCode;
    const sourceScriptCode = data.sourceScriptCode;
    const targetScriptCode = data.targetScriptCode || "Latn";

    // Load recording and choose source text
    let recording: any;
    try {
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      throw notFound();
    }

    const sourceText = recording.translationText || recording.transcriptionText;
    if (!sourceText) {
      return { status: 400, message: "No text available to transliterate" };
    }

    // Determine language
    const lang = (languageCode || recording.translationLanguage || recording.language || "").toString();
    if (!lang || !isSupportedTranslateLanguage(lang)) {
      return { status: 400, message: "Unknown or unsupported language code" };
    }

    // Determine source script
    const srcScript = sourceScriptCode || getDefaultScriptForLanguage(lang);
    if (!srcScript) {
      return { status: 400, message: "Unable to determine source script for language" };
    }

    // Perform transliteration
    try {
      const transliteratedText = transliterateText(
        sourceText,
        lang,
        srcScript,
        targetScriptCode,
      );
      return {
        status: 200,
        transliteratedText,
        languageCode: lang,
        sourceScriptCode: srcScript,
        targetScriptCode,
      };
    } catch (error: any) {
      return { status: 502, message: `Transliteration service error: ${error?.message || "Unknown error"}` };
    }
  });

export const Route = createFileRoute(
  "/api/recordings/$recordingId/transliterate/",
)({
  loaderDeps: (ctx: any) => ({ recordingId: ctx?.params?.recordingId }),
  serverComponent: async ({ params, deps, request }: any) => {
    logger.info(`Request received: ${request.method} ${request.url}`);
    if (params.recordingId !== deps.recordingId) {
      return apiError("recordingId mismatch", 400);
    }
    try {
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const result = await postTransliterate({ data: { recordingId: params.recordingId, ...body } });
        return apiSuccess(result);
      }
      return apiMethodNotAllowed(["POST"]);
    } catch (error) {
      if (error === notFound()) {
        return apiNotFound(`Recording not found: ${params.recordingId}`);
      }
      const { error: errorMessage, status } = handleApiError(
        error,
        `API.TransliterateRoute(${params.recordingId})`,
      );
      return apiError(errorMessage, status);
    }
  },
} as any);


