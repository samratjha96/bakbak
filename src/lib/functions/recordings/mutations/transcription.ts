/**
 * ABOUTME: Recording transcription update server functions
 * ABOUTME: Handles updating transcription data and status for recordings
 */
import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { Transcription, TranscriptionStatus } from "~/types/recording";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { DbTranscription } from "~/database/types";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";

export const updateRecordingTranscription = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; transcription: Partial<Transcription> }) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if transcription record exists
    let dbTranscription = db
      .prepare(
        `
      SELECT * FROM transcriptions WHERE recording_id = ?
    `,
      )
      .get(data.id) as DbTranscription | undefined;

    if (dbTranscription) {
      // Update existing transcription
      db.prepare(
        `
        UPDATE transcriptions
        SET text = COALESCE(?, text),
            romanization = COALESCE(?, romanization),
            status = CASE WHEN ? = 1 THEN 'COMPLETED' ELSE status END,
            updated_at = ?
        WHERE recording_id = ?
      `,
      ).run(
        data.transcription.text || null,
        data.transcription.romanization || null,
        data.transcription.isComplete ? 1 : 0,
        now,
        data.id,
      );
    } else if (data.transcription.text) {
      // Create new transcription
      const transcriptionId = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO transcriptions (
          id, recording_id, text, romanization, language, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        transcriptionId,
        data.id,
        data.transcription.text,
        data.transcription.romanization || null,
        "auto", // We'll need to detect or pass language
        data.transcription.isComplete ? "COMPLETED" : "IN_PROGRESS",
        now,
        now,
      );
    }

    return fetchRecording({ data: data.id });
  });

export const updateRecordingTranscriptionStatus = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      id: string;
      status: TranscriptionStatus;
      transcriptionText?: string;
      jobId?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get or create transcription record
    let dbTranscription = db
      .prepare(
        `
      SELECT * FROM transcriptions WHERE recording_id = ?
    `,
      )
      .get(data.id) as DbTranscription | undefined;

    if (dbTranscription) {
      // Update existing transcription
      db.prepare(
        `
        UPDATE transcriptions
        SET status = ?, text = COALESCE(?, text), job_id = COALESCE(?, job_id), updated_at = ?
        WHERE recording_id = ?
      `,
      ).run(
        data.status,
        data.transcriptionText || null,
        data.jobId || null,
        now,
        data.id,
      );
    } else {
      // Create new transcription record even without text (for status tracking)
      const transcriptionId = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO transcriptions (
          id, recording_id, text, language, job_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        transcriptionId,
        data.id,
        data.transcriptionText || null,
        "auto",
        data.jobId || null,
        data.status,
        now,
        now,
      );
    }

    return fetchRecording({ data: data.id });
  });
