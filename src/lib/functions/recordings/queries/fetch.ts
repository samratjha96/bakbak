/**
 * ABOUTME: Recording data fetching server functions
 * ABOUTME: Handles retrieving recordings with joined transcription/translation data
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { Recording } from "~/types/recording";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { mapJoinedRowToRecording } from "~/lib/functions/shared/helpers";

export const fetchRecordings = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const db = getDatabase();
      const authed = await isAuthenticated();
      if (!authed) {
        return [];
      }
      const userId = await getCurrentUserId();

      // Check if recordings table exists first
      const tablesExist = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='recordings'",
        )
        .get();

      if (!tablesExist) {
        // Return empty array if table doesn't exist yet
        console.warn(
          "Recordings table does not exist. Database may not be initialized.",
        );
        return [];
      }

      // Single optimized query with JOINs - no N+1 queries
      const rows = db
        .prepare(
          `
        SELECT
          r.*,
          t.id as transcription_id,
          t.text as transcription_text,
          t.romanization as transcription_romanization,
          t.language as transcription_language,
          t.job_id as transcription_job_id,
          t.status as transcription_status,
          t.created_at as transcription_created_at,
          t.updated_at as transcription_updated_at,
          tr.id as translation_id,
          tr.text as translation_text,
          tr.source_language as translation_source_language,
          tr.target_language as translation_target_language,
          tr.status as translation_status,
          tr.created_at as translation_created_at,
          tr.updated_at as translation_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        LEFT JOIN translations tr ON t.id = tr.transcription_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `,
        )
        .all(userId);

      // Map results efficiently
      const recordingsMap = new Map<string, Recording>();

      for (const row of rows as any[]) {
        const recording = mapJoinedRowToRecording(row);
        recordingsMap.set(row.id, recording);
      }

      return Array.from(recordingsMap.values());
    } catch (error) {
      console.error("Error fetching recordings:", error);
      // Return empty array on error
      return [];
    }
  },
);

export const fetchRecording = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const authed = await isAuthenticated();
    if (!authed) {
      throw notFound();
    }
    const userId = await getCurrentUserId();

    // Single optimized query with JOINs
    const row = db
      .prepare(
        `
      SELECT
        r.*,
        t.id as transcription_id,
        t.text as transcription_text,
        t.romanization as transcription_romanization,
        t.language as transcription_language,
        t.job_id as transcription_job_id,
        t.status as transcription_status,
        t.created_at as transcription_created_at,
        t.updated_at as transcription_updated_at,
        tr.id as translation_id,
        tr.text as translation_text,
        tr.source_language as translation_source_language,
        tr.target_language as translation_target_language,
        tr.status as translation_status,
        tr.created_at as translation_created_at,
        tr.updated_at as translation_updated_at
      FROM recordings r
      LEFT JOIN transcriptions t ON r.id = t.recording_id
      LEFT JOIN translations tr ON t.id = tr.transcription_id
      WHERE r.id = ? AND r.user_id = ?
    `,
      )
      .get(id, userId);

    if (!row) {
      throw notFound();
    }

    return mapJoinedRowToRecording(row);
  });