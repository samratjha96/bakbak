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
import {
  DbRecording,
  DbTranscription,
  DbTranslation,
  DbNote,
} from "~/database/types";
import { auth } from "~/lib/auth";

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
  }

  // Add translation data if available
  if (row.translation_id) {
    recording.translationText = row.translation_text;
    recording.translationLanguage = row.translation_target_language;
    recording.translationLastUpdated = new Date(row.translation_updated_at);
  }

  // Add notes if available
  if (row.note_id) {
    recording.notes = {
      content: row.note_content,
      lastUpdated: new Date(row.note_updated_at),
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
          t.status as transcription_status,
          t.created_at as transcription_created_at,
          t.updated_at as transcription_updated_at,
          tr.id as translation_id,
          tr.text as translation_text,
          tr.source_language as translation_source_language,
          tr.target_language as translation_target_language,
          tr.status as translation_status,
          tr.created_at as translation_created_at,
          tr.updated_at as translation_updated_at,
          n.id as note_id,
          n.content as note_content,
          n.timestamp as note_timestamp,
          n.created_at as note_created_at,
          n.updated_at as note_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        LEFT JOIN translations tr ON t.id = tr.transcription_id
        LEFT JOIN notes n ON r.id = n.recording_id AND n.user_id = ?
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `,
        )
        .all(userId, userId);

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
        t.status as transcription_status,
        t.created_at as transcription_created_at,
        t.updated_at as transcription_updated_at,
        tr.id as translation_id,
        tr.text as translation_text,
        tr.source_language as translation_source_language,
        tr.target_language as translation_target_language,
        tr.status as translation_status,
        tr.created_at as translation_created_at,
        tr.updated_at as translation_updated_at,
        n.id as note_id,
        n.content as note_content,
        n.timestamp as note_timestamp,
        n.created_at as note_created_at,
        n.updated_at as note_updated_at
      FROM recordings r
      LEFT JOIN transcriptions t ON r.id = t.recording_id
      LEFT JOIN translations tr ON t.id = tr.transcription_id
      LEFT JOIN notes n ON r.id = n.recording_id AND n.user_id = ?
      WHERE r.id = ? AND r.user_id = ?
    `,
      )
      .get(userId, id, userId);

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

    // Use the requested S3 file path format
    const filePath = `recordings/XqmkB9YbkUfYoHhUy4FBkMShidp6KHdx/2025-07-27/${crypto.randomUUID()}.webm`;

    const dbRecording = {
      id: recordingId,
      user_id: userId,
      title: data.title,
      description: null as string | null,
      file_path: filePath,
      language: data.language || (null as string | null),
      duration: data.duration,
      status: "processing" as const,
      created_at: now,
    };

    db.prepare(
      `
       INSERT INTO recordings (
         id, user_id, title, description, file_path, language,
         duration, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     `,
    ).run(
      dbRecording.id,
      dbRecording.user_id,
      dbRecording.title,
      dbRecording.description,
      dbRecording.file_path,
      dbRecording.language,
      dbRecording.duration,
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

    // Check if note exists
    let dbNote = db
      .prepare(
        `
      SELECT * FROM notes WHERE recording_id = ? AND user_id = ?
    `,
      )
      .get(data.id, userId) as DbNote | undefined;

    if (dbNote && data.notes.content !== undefined) {
      // Update existing note
      db.prepare(
        `
        UPDATE notes SET content = ?, updated_at = ? WHERE id = ?
      `,
      ).run(data.notes.content, now, dbNote.id);
    } else if (
      data.notes.content !== undefined &&
      data.notes.content !== null
    ) {
      // Create new note
      const noteId = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO notes (id, recording_id, user_id, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run(noteId, data.id, userId, data.notes.content, now, now);

      dbNote = {
        id: noteId,
        recording_id: data.id,
        user_id: userId,
        content: data.notes.content as string,
        created_at: now,
        updated_at: now,
      };
    }

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
      transcriptionUrl?: string;
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
        SET status = ?, text = COALESCE(?, text), updated_at = ?
        WHERE recording_id = ?
      `,
      ).run(data.status, data.transcriptionText || null, now, data.id);
    } else if (data.transcriptionText) {
      // Create new transcription
      const transcriptionId = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO transcriptions (
          id, recording_id, text, language, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        transcriptionId,
        data.id,
        data.transcriptionText,
        "auto",
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
