/**
 * Server-only translation functions
 * Database imports are safe here - never sent to client
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { getDatabase, getCurrentUserId } from "~/database/connection";
import { createLogger } from "~/utils/logger";
import { AppError } from "~/utils/errorHandling";

const logger = createLogger("TranslationServer");

// Translation data interface
export interface TranslationData {
  translationText: string | undefined;
  translationLanguage: string | undefined;
  translationLastUpdated?: Date;
  isTranslated: boolean;
}

// Server function to fetch translation data - database imports safe here
export const fetchTranslationData = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<TranslationData> => {
    logger.info(`Fetching translation data for recording ${id}`);

    try {
      const db = getDatabase();
      const userId = getCurrentUserId();

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
        throw notFound();
      }

      return {
        translationText: result?.translation_text,
        translationLanguage: result?.translation_language,
        translationLastUpdated: result?.translation_updated_at
          ? new Date(result.translation_updated_at)
          : undefined,
        isTranslated: result?.translation_status === "COMPLETED",
      };
    } catch (error) {
      if (error === notFound()) {
        throw error;
      }
      logger.error(`Error fetching translation data:`, error);
      throw new AppError(
        `Failed to fetch translation data: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  });
