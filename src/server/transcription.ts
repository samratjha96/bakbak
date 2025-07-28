/**
 * Server-only transcription functions
 * Database imports are safe here - never sent to client
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { TranscriptionStatus } from "~/types/recording";
import { getDatabase, getCurrentUserId } from "~/database/connection";
import { createLogger } from "~/utils/logger";
import { AppError } from "~/utils/errorHandling";

const logger = createLogger("TranscriptionServer");

// Transcription data interface
export interface TranscriptionData {
  transcriptionText: string | undefined;
  transcriptionStatus: TranscriptionStatus;
  transcriptionLastUpdated?: Date;
  romanization?: string;
}

// Server function to fetch transcription data - database imports safe here
export const fetchTranscriptionData = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<TranscriptionData> => {
    logger.info(`Fetching transcription data for recording ${id}`);

    try {
      const db = getDatabase();
      const userId = getCurrentUserId();

      const result = db
        .prepare(
          `
        SELECT 
          t.text as transcription_text,
          t.romanization,
          t.status as transcription_status,
          t.updated_at as transcription_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        WHERE r.id = ? AND r.user_id = ?
      `,
        )
        .get(id, userId) as
        | {
            transcription_text?: string;
            romanization?: string;
            transcription_status?: string;
            transcription_updated_at?: string;
          }
        | undefined;

      if (!result) {
        throw notFound();
      }

      return {
        transcriptionText: result?.transcription_text,
        transcriptionStatus:
          (result?.transcription_status as TranscriptionStatus) ||
          "NOT_STARTED",
        transcriptionLastUpdated: result?.transcription_updated_at
          ? new Date(result.transcription_updated_at)
          : undefined,
        romanization: result?.romanization,
      };
    } catch (error) {
      if (error === notFound()) {
        throw error;
      }
      logger.error(`Error fetching transcription data:`, error);
      throw new AppError(
        `Failed to fetch transcription data: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  });
