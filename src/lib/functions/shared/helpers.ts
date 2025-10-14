/**
 * ABOUTME: Shared helper functions used across multiple server function domains
 * ABOUTME: Database mapping utilities and common transformations
 */
import {
  Recording,
  Transcription,
  Notes,
  TranscriptionStatus,
} from "~/types/recording";
import { getS3Url } from "~/lib/aws-config";

/**
 * Helper function to convert joined query results to UI Recording type
 */
export function mapJoinedRowToRecording(
  row: any, // JOIN result has dynamic columns
): Recording {
  const recording: Recording = {
    id: row.id,
    title: row.title,
    language: row.language,
    duration: row.duration,
    createdAt: new Date(row.created_at),
    audioUrl: getS3Url(row.file_path),
    isTranscribed: row.transcription_status === "COMPLETED" || false,
    transcriptionStatus:
      (row.transcription_status as TranscriptionStatus) || "NOT_STARTED",
    isTranslated: row.translation_status === "COMPLETED" || false,
  };

  // Add transcription data if available
  if (row.transcription_id) {
    recording.transcription = {
      text: row.transcription_text,
      romanization: row.transcription_romanization,
      isComplete: row.transcription_status === "COMPLETED",
      lastUpdated: new Date(row.transcription_updated_at),
    };
    recording.transcriptionText = row.transcription_text;
    recording.transcriptionLastUpdated = new Date(row.transcription_updated_at);
    // Map job_id from transcriptions table for job tracking
    if (row.transcription_job_id) {
      recording.transcriptionUrl = row.transcription_job_id;
    }
  }

  // Add translation data if available
  if (row.translation_id) {
    recording.translationText = row.translation_text;
    recording.translationLanguage = row.translation_target_language;
    recording.translationLastUpdated = new Date(row.translation_updated_at);
  }

  // Add notes from recordings table if available
  if (row.notes) {
    recording.notes = {
      content: row.notes,
      lastUpdated: new Date(row.updated_at),
    };
  }

  return recording;
}

/**
 * Helper function to romanize transcription text with error handling
 */
export async function romanizeTranscriptionText(
  text: string,
  language: string,
): Promise<string | undefined> {
  try {
    const { romanizeText } = await import("~/lib/functions/ai/romanization");
    const result = await romanizeText({
      data: {
        text,
        sourceLanguage: language,
      },
    });
    return result.romanizedText;
  } catch (error) {
    console.error("Romanization failed:", error);
    return undefined; // Don't fail the whole transcription if romanization fails
  }
}
