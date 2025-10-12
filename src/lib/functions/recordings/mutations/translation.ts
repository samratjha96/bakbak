/**
 * ABOUTME: Recording translation update server functions
 * ABOUTME: Handles updating translation data for recordings
 */
import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import {
  getDatabase,
} from "~/database/connection";
import { DbTranscription, DbTranslation } from "~/database/types";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";

export const updateRecordingTranslation = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      translationText: string;
      translationLanguage: string;
      translationUrl?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get transcription first
    const dbTranscription = db
      .prepare(
        `
      SELECT * FROM transcriptions WHERE recording_id = ?
    `,
      )
      .get(data.id) as DbTranscription | undefined;

    if (!dbTranscription) {
      throw new Error("Cannot create translation without transcription");
    }

    // Check if translation exists
    let dbTranslation = db
      .prepare(
        `
      SELECT * FROM translations WHERE transcription_id = ?
    `,
      )
      .get(dbTranscription.id) as DbTranslation | undefined;

    if (dbTranslation) {
      // Update existing translation
      db.prepare(
        `
        UPDATE translations
        SET text = ?, target_language = ?, status = 'COMPLETED', updated_at = ?
        WHERE transcription_id = ?
      `,
      ).run(
        data.translationText,
        data.translationLanguage,
        now,
        dbTranscription.id,
      );
    } else {
      // Create new translation
      const translationId = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO translations (
          id, transcription_id, text, source_language, target_language, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        translationId,
        dbTranscription.id,
        data.translationText,
        dbTranscription.language,
        data.translationLanguage,
        "COMPLETED",
        now,
        now,
      );
    }

    return fetchRecording({ data: data.id });
  });