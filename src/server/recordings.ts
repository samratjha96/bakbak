/**
 * Server-only recording functions
 * Database imports are safe here - never sent to client
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import crypto from "crypto";
import {
  Recording,
  Transcription,
  Notes,
  TranscriptionStatus,
} from "~/types/recording";
import { getDatabase } from "~/database/connection";
import { DbRecording, DbTranscription, DbTranslation } from "~/database/types";
import { auth } from "~/lib/auth";
import { s3 } from "~/lib/s3";

// Helper function to convert joined query results to UI Recording type
function mapJoinedRowToRecording(
  row: any, // JOIN result has dynamic columns
): Recording {
  const recording: Recording = {
    id: row.id,
    title: row.title,
    language: row.language,
    duration: row.duration,
    createdAt: new Date(row.created_at),
    audioUrl: `https://s3.amazonaws.com/${process.env.AWS_S3_BUCKET || "your-bucket"}/${row.file_path}`,
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

// Helper function to get current user ID with proper error handling
function getCurrentUserId(): string {
  try {
    const db = getDatabase();
    // Get first user or create one for development
    let testUser = db.prepare("SELECT id FROM user LIMIT 1").get() as
      | { id: string }
      | undefined;

    if (!testUser) {
      // Create a test user if none exists
      const userId = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        userId,
        "Test User",
        "test@example.com",
        1,
        null,
        new Date().toISOString(),
        new Date().toISOString(),
      );

      testUser = { id: userId };
    }

    return testUser.id;
  } catch (error) {
    throw new Error(
      "Unable to access user data. Please refresh the page and try again.",
    );
  }
}

// SERVER FUNCTIONS - Database access safe here
export const fetchRecordings = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const db = getDatabase();
      const userId = getCurrentUserId();

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
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();

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

export const createRecording = createServerFn({ method: "POST" })
  .validator(
    (
      data: Omit<
        Recording,
        | "id"
        | "createdAt"
        | "isTranscribed"
        | "transcriptionStatus"
        | "isTranslated"
      >,
    ) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();
    const recordingId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Derive S3 file path from provided audioUrl if available
    const filePath =
      (() => {
        try {
          const audioUrl = (data as any).audioUrl as string | undefined;
          if (!audioUrl) return null;
          const u = new URL(audioUrl);
          const host = u.host;
          const pathname = u.pathname.replace(/^\//, "");
          const bucket = process.env.AWS_S3_BUCKET;
          // Virtual-hosted–style: <bucket>.s3.*.amazonaws.com/<key>
          if (bucket && host.startsWith(`${bucket}.s3`)) return pathname;
          // Path-style: s3.*.amazonaws.com/<bucket>/<key> or s3.amazonaws.com/<bucket>/<key>
          const parts = pathname.split("/");
          if (parts.length >= 2) {
            if (!bucket || parts[0] === bucket) {
              return parts.slice(1).join("/");
            }
            return parts.join("/");
          }
        } catch {}
        return null;
      })() ||
      `recordings/${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.webm`;

    const notesContent: string | null = data.notes?.content ?? null;

    const dbRecording = {
      id: recordingId,
      user_id: userId,
      title: data.title,
      description: null as string | null,
      file_path: filePath,
      language: data.language || (null as string | null),
      duration: data.duration,
      notes: notesContent,
      status: "processing" as const,
      created_at: now,
    };

    db.prepare(
      `
       INSERT INTO recordings (
         id, user_id, title, description, file_path, language,
         duration, notes, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     `,
    ).run(
      dbRecording.id,
      dbRecording.user_id,
      dbRecording.title,
      dbRecording.description,
      dbRecording.file_path,
      dbRecording.language,
      dbRecording.duration,
      dbRecording.notes,
      dbRecording.status,
      dbRecording.created_at,
      now,
    );

    // Return the newly created recording by fetching it
    return fetchRecording({ data: recordingId });
  });

export const updateRecordingTranscription = createServerFn({ method: "POST" })
  .validator(
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

export const updateRecordingNotes = createServerFn({ method: "POST" })
  .validator((data: { id: string; notes: Partial<Notes> }) => data)
  .handler(async ({ data }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();
    const now = new Date().toISOString();

    // Ensure the recording belongs to the user
    const existing = db
      .prepare(`SELECT id FROM recordings WHERE id = ? AND user_id = ?`)
      .get(data.id, userId) as { id: string } | undefined;
    if (!existing) {
      throw new Error("Recording not found or permission denied");
    }

    db.prepare(
      `UPDATE recordings SET notes = ?, updated_at = ? WHERE id = ?`,
    ).run(data.notes.content ?? null, now, data.id);

    return fetchRecording({ data: data.id });
  });

export const updateRecordingTranscriptionStatus = createServerFn({
  method: "POST",
})
  .validator(
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

export const updateRecordingTranslation = createServerFn({ method: "POST" })
  .validator(
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

export const updateRecording = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      title?: string;
      description?: string;
      language?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();
    const now = new Date().toISOString();

    // Check if recording exists and belongs to user
    const existingRecording = db
      .prepare(
        `
      SELECT * FROM recordings WHERE id = ? AND user_id = ?
    `,
      )
      .get(data.id, userId);

    if (!existingRecording) {
      throw new Error(
        "Recording not found or you do not have permission to edit it.",
      );
    }

    // Build update query dynamically based on provided fields
    const updates: Record<string, any> = { updated_at: now };

    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.language !== undefined) updates.language = data.language;

    // Build SET clause
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    // Build values array
    const values = Object.values(updates);
    values.push(data.id); // Add id for WHERE clause

    // Execute update
    db.prepare(
      `
      UPDATE recordings
      SET ${setClause}
      WHERE id = ?
    `,
    ).run(...values);

    return fetchRecording({ data: data.id });
  });

export const deleteRecording = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();

    // Verify recording exists and belongs to user
    const existing = db
      .prepare(
        `SELECT id, file_path FROM recordings WHERE id = ? AND user_id = ?`,
      )
      .get(id, userId) as { id: string; file_path: string } | undefined;

    if (!existing) {
      throw new Error(
        "Recording not found or you do not have permission to delete it.",
      );
    }

    // First attempt to delete the S3 object (idempotent on S3 side)
    try {
      await s3.delete(existing.file_path);
    } catch (error) {
      console.error("Error deleting S3 object:", error);
      throw new Error(
        "Could not delete audio file from storage. Please try again.",
      );
    }

    // Then delete from the database in a transaction (cascades to related rows)
    const tx = (db as any).transaction(
      (recordingId: string, ownerId: string) => {
        db.prepare(`DELETE FROM recordings WHERE id = ? AND user_id = ?`).run(
          recordingId,
          ownerId,
        );
      },
    );

    try {
      tx(id, userId);
    } catch (error) {
      console.error("Error deleting recording from database:", error);
      throw new Error(
        "Deleted file from storage, but failed to update the database. Please contact support.",
      );
    }

    return { success: true };
  });

/**
 * Get the raw S3 path for a recording (for AWS services like Transcribe)
 */
export const getRecordingPath = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();

    // Check if recording exists and belongs to user
    const recording = db
      .prepare(
        `SELECT id, file_path FROM recordings WHERE id = ? AND user_id = ?`,
      )
      .get(id, userId) as { id: string; file_path: string } | undefined;

    if (!recording) {
      throw new Error(
        "Recording not found or you do not have permission to access it.",
      );
    }

    // Return S3 URI format for AWS services
    const s3Uri = `s3://${process.env.AWS_S3_BUCKET || "your-bucket"}/${recording.file_path}`;

    return {
      s3Uri,
      filePath: recording.file_path,
    };
  });

/**
 * Generate a presigned URL for downloading a recording
 */
export const getRecordingPresignedUrl = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const userId = getCurrentUserId();

    // Check if recording exists and belongs to user
    const recording = db
      .prepare(
        `SELECT id, file_path, language, duration FROM recordings WHERE id = ? AND user_id = ?`,
      )
      .get(id, userId) as
      | {
          id: string;
          file_path: string;
          language: string | null;
          duration: number;
        }
      | undefined;

    if (!recording) {
      throw new Error(
        "Recording not found or you do not have permission to access it.",
      );
    }

    try {
      // Generate a presigned URL with 15 minute expiration (900 seconds)
      const presignedUrl = await s3.getSignedUrl(recording.file_path, 900);

      // Also generate a direct S3 URL as fallback
      const directUrl = `https://s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${process.env.AWS_S3_BUCKET || "your-bucket"}/${recording.file_path}`;

      return {
        url: presignedUrl,
        directUrl: directUrl,
        expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new Error("Failed to generate audio URL. Please try again.");
    }
  });
