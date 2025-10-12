/**
 * ABOUTME: Content processing transcription query server functions
 * ABOUTME: Handles fetching transcription data and status checking
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TranscriptionStatus } from "~/types/recording";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import {
  withErrorHandling,
  ServerErrors,
  validateRequired,
  validateString,
  type ServerResponse,
} from "~/utils/server-errors";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";

export interface TranscriptionData {
  transcriptionText: string | undefined;
  transcriptionStatus: TranscriptionStatus;
  transcriptionLastUpdated?: Date;
  romanization?: string;
}

/**
 * Fetch transcription data only (backward compatible)
 */
export const fetchTranscriptionData = createServerFn({ method: "GET" })
  .inputValidator((id: string) => {
    validateRequired(id, "Recording ID");
    validateString(id, "Recording ID");
    return id;
  })
  .handler(async ({ data: id }): Promise<TranscriptionData> => {
    const userId = await getCurrentUserId();
    if (!userId) throw ServerErrors.unauthorized();

    const db = getDatabase();

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
      throw ServerErrors.notFound("Recording");
    }

    return {
      transcriptionText: result.transcription_text,
      transcriptionStatus:
        (result.transcription_status as TranscriptionStatus) || "NOT_STARTED",
      transcriptionLastUpdated: result.transcription_updated_at
        ? new Date(result.transcription_updated_at)
        : undefined,
      romanization: result.romanization,
    };
  });

export const getTranscription = createServerFn({ method: "GET" })
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

    if (
      !recording.isTranscribed ||
      recording.transcriptionStatus !== "COMPLETED"
    ) {
      throw new Error("No completed transcription found for this recording");
    }

    let transcriptionResult = null;
    if (recording.transcriptionUrl) {
      try {
        const jobId = recording.transcriptionUrl.split("/").pop() || "";
        const { transcribe } = await import("~/lib/transcribe");
        transcriptionResult = await transcribe.getTranscriptionResult(jobId);
      } catch (error) {
        console.error("Error fetching detailed transcription result:", error);
      }
    }

    return {
      transcription: recording.transcription,
      transcriptionText: recording.transcriptionText,
      transcriptionLastUpdated: recording.transcriptionLastUpdated,
      detailedResult: transcriptionResult,
      recordingId,
    };
  });