import { getDatabase } from "../connection";
import { DbTranscription, TranscriptionSegment } from "../types";
import crypto from "crypto";

/**
 * Interface for transcription data in application code
 */
export interface Transcription {
  id: string;
  recordingId: string;
  text: string;
  romanization?: string;
  language: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a transcription
 */
export interface CreateTranscriptionInput {
  recordingId: string;
  text: string;
  romanization?: string;
  language: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

/**
 * Input for updating a transcription
 */
export interface UpdateTranscriptionInput {
  text?: string;
  romanization?: string;
  language?: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

/**
 * Convert DbTranscription to Transcription
 */
function mapDbToTranscription(db: DbTranscription): Transcription {
  return {
    id: db.id,
    recordingId: db.recording_id,
    text: db.text,
    romanization: db.romanization,
    language: db.language,
    status: db.status,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Transcription model for database operations
 */
export class TranscriptionModel {
  /**
   * Generate a unique ID for a new transcription
   */
  static generateId(): string {
    return `trans-${crypto.randomUUID()}`;
  }

  /**
   * Find a transcription by ID
   */
  static findById(id: string): Transcription | null {
    const db = getDatabase();
    const transcription = db
      .prepare(
        `
      SELECT * FROM transcriptions WHERE id = ?
    `,
      )
      .get(id) as DbTranscription | undefined;

    return transcription ? mapDbToTranscription(transcription) : null;
  }

  /**
   * Find a transcription by recording ID
   */
  static findByRecordingId(recordingId: string): Transcription | null {
    const db = getDatabase();
    const transcription = db
      .prepare(
        `
      SELECT * FROM transcriptions 
      WHERE recording_id = ?
    `,
      )
      .get(recordingId) as DbTranscription | undefined;

    return transcription ? mapDbToTranscription(transcription) : null;
  }

  /**
   * Create a new transcription
   */
  static create(input: CreateTranscriptionInput): Transcription {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const transcription: DbTranscription = {
      id,
      recording_id: input.recordingId,
      text: input.text,
      romanization: input.romanization,
      language: input.language,
      status: input.status || "NOT_STARTED",
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
      INSERT INTO transcriptions (
        id, recording_id, text, romanization, language,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      transcription.id,
      transcription.recording_id,
      transcription.text,
      transcription.romanization,
      transcription.language,
      transcription.segments,
      transcription.status,
      transcription.created_at,
      transcription.updated_at,
    );

    return mapDbToTranscription(transcription);
  }

  /**
   * Update a transcription
   */
  static update(
    id: string,
    input: UpdateTranscriptionInput,
  ): Transcription | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the transcription exists
    const existingTranscription = this.findById(id);
    if (!existingTranscription) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.text !== undefined) updates.text = input.text;
    if (input.romanization !== undefined)
      updates.romanization = input.romanization;
    if (input.language !== undefined) updates.language = input.language;
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
      UPDATE transcriptions
      SET ${setClause}
      WHERE id = ?
    `,
    ).run(...values);

    // Return updated transcription
    return this.findById(id);
  }

  /**
   * Delete a transcription
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM transcriptions WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  /**
   * Update transcription status
   */
  static updateStatus(
    id: string,
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
  ): Transcription | null {
    return this.update(id, { status });
  }

  /**
   * Find pending transcriptions
   */
  static findPending(): Transcription[] {
    const db = getDatabase();
    const transcriptions = db
      .prepare(
        `
      SELECT * FROM transcriptions 
      WHERE status IN ('NOT_STARTED', 'IN_PROGRESS')
      ORDER BY created_at ASC
    `,
      )
      .all() as DbTranscription[];

    return transcriptions.map(mapDbToTranscription);
  }
}
