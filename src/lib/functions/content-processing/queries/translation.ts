/**
 * ABOUTME: Content processing translation query server functions
 * ABOUTME: Handles fetching translation data for recordings
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import {
  ServerErrors,
  validateRequired,
  validateString,
} from "~/utils/server-errors";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";

export interface TranslationData {
  translationText: string | undefined;
  translationLanguage: string | undefined;
  translationLastUpdated?: Date;
  isTranslated: boolean;
}

/**
 * Fetch translation data only (backward compatible)
 */
export const fetchTranslationData = createServerFn({ method: "GET" })
  .inputValidator((id: string) => {
    validateRequired(id, "Recording ID");
    validateString(id, "Recording ID");
    return id;
  })
  .handler(async ({ data: id }): Promise<TranslationData> => {
    const userId = await getCurrentUserId();
    if (!userId) throw ServerErrors.unauthorized();

    const db = getDatabase();

    const result = db
      .prepare(
        `
        SELECT
          tr.text as translation_text,
          tr.target_language as translation_language,
          tr.status as translation_status,
          tr.updated_at as translation_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        LEFT JOIN translations tr ON t.id = tr.transcription_id
        WHERE r.id = ? AND r.user_id = ?
      `,
      )
      .get(id, userId) as
      | {
          translation_text?: string;
          translation_language?: string;
          translation_status?: string;
          translation_updated_at?: string;
        }
      | undefined;

    if (!result) {
      throw ServerErrors.notFound("Recording");
    }

    return {
      translationText: result.translation_text,
      translationLanguage: result.translation_language,
      translationLastUpdated: result.translation_updated_at
        ? new Date(result.translation_updated_at)
        : undefined,
      isTranslated: result.translation_status === "COMPLETED",
    };
  });

export const getTranslation = createServerFn({ method: "GET" })
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
      throw ServerErrors.notFound("Recording");
    }

    if (!recording.isTranslated || !recording.translationText) {
      throw new Error("No translation found for this recording");
    }

    return {
      translationText: recording.translationText,
      translationLanguage: recording.translationLanguage,
      translationLastUpdated: recording.translationLastUpdated,
      translationUrl: recording.translationUrl,
      recordingId,
    };
  });