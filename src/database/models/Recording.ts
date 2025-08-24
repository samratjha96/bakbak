import { getDatabase } from "../connection";
import { DbRecording } from "../types";
import crypto from "crypto";

/**
 * Interface for recording data in application code
 */
export interface Recording {
  id: string;
  userId: string;
  title: string;
  description?: string;
  filePath: string;
  language?: string;
  duration: number; // in seconds
  metadata?: Record<string, any>;
  status: "processing" | "ready" | "error";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a recording
 */
export interface CreateRecordingInput {
  userId: string;
  title: string;
  description?: string;
  filePath: string;
  language?: string;
  duration: number;
  metadata?: Record<string, any>;
  status?: "processing" | "ready" | "error";
}

/**
 * Input for updating a recording
 */
export interface UpdateRecordingInput {
  title?: string;
  description?: string;
  filePath?: string;
  language?: string;
  duration?: number;
  metadata?: Record<string, any>;
  status?: "processing" | "ready" | "error";
}

/**
 * Convert DbRecording to Recording
 */
function mapDbToRecording(db: DbRecording): Recording {
  return {
    id: db.id,
    userId: db.user_id,
    title: db.title,
    description: db.description,
    filePath: db.file_path,
    language: db.language,
    duration: db.duration,
    metadata: db.metadata ? JSON.parse(db.metadata) : undefined,
    status: db.status,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Recording model for database operations
 */
export class RecordingModel {
  /**
   * Generate a unique ID for a new recording
   */
  static generateId(): string {
    return `rec-${crypto.randomUUID()}`;
  }

  /**
   * Find a recording by ID
   */
  static findById(id: string): Recording | null {
    const db = getDatabase();
    const recording = db
      .prepare(
        `
      SELECT * FROM recordings WHERE id = ?
    `,
      )
      .get(id) as DbRecording | undefined;

    return recording ? mapDbToRecording(recording) : null;
  }

  /**
   * Find all recordings for a user
   */
  static findByUserId(userId: string): Recording[] {
    const db = getDatabase();
    const recordings = db
      .prepare(
        `
      SELECT * FROM recordings 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(userId) as DbRecording[];

    return recordings.map(mapDbToRecording);
  }

  /**
   * Find recordings by language
   */
  static findByLanguage(language: string): Recording[] {
    const db = getDatabase();
    const recordings = db
      .prepare(
        `
      SELECT * FROM recordings 
      WHERE language = ?
      ORDER BY created_at DESC
    `,
      )
      .all(language) as DbRecording[];

    return recordings.map(mapDbToRecording);
  }

  /**
   * Create a new recording
   */
  static create(input: CreateRecordingInput): Recording {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const recording: DbRecording = {
      id,
      user_id: input.userId,
      title: input.title,
      description: input.description,
      file_path: input.filePath,
      language: input.language,
      duration: input.duration,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      status: input.status || "processing",
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
      INSERT INTO recordings (
        id, user_id, title, description, file_path, language,
        duration, metadata, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      recording.id,
      recording.user_id,
      recording.title,
      recording.description,
      recording.file_path,
      recording.language,
      recording.duration,
      recording.metadata,
      recording.status,
      recording.created_at,
      recording.updated_at,
    );

    return mapDbToRecording(recording);
  }

  /**
   * Update a recording
   */
  static update(id: string, input: UpdateRecordingInput): Recording | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the recording exists
    const existingRecording = this.findById(id);
    if (!existingRecording) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.filePath !== undefined) updates.file_path = input.filePath;
    if (input.language !== undefined) updates.language = input.language;
    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.metadata !== undefined)
      updates.metadata = JSON.stringify(input.metadata);
    if (input.status !== undefined) updates.status = input.status;

    // Build SET clause for SQL
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    // Build values array for SQL
    const values = Object.values(updates);
    values.push(id); // Add id for WHERE clause

    // Execute update
    db.prepare(
      `
      UPDATE recordings
      SET ${setClause}
      WHERE id = ?
    `,
    ).run(...values);

    // Return updated recording
    return this.findById(id);
  }

  /**
   * Delete a recording
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM recordings WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Update recording status
   */
  static updateStatus(
    id: string,
    status: "processing" | "ready" | "error",
  ): Recording | null {
    return this.update(id, { status });
  }

  /**
   * Count recordings by user
   */
  static countByUserId(userId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM recordings WHERE user_id = ?")
      .get(userId) as { count: number };
    return result.count;
  }

  /**
   * Get latest recordings (with pagination)
   */
  static getLatest(limit: number = 10, offset: number = 0): Recording[] {
    const db = getDatabase();
    const recordings = db
      .prepare(
        `
      SELECT * FROM recordings
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(limit, offset) as DbRecording[];

    return recordings.map(mapDbToRecording);
  }
}
