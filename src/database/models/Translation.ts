import { getDatabase } from "../connection";
import { DbTranslation } from "../types";
import crypto from "crypto";

/**
 * Interface for translation data in application code
 */
export interface Translation {
  id: string;
  transcriptionId: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a translation
 */
export interface CreateTranslationInput {
  transcriptionId: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

/**
 * Input for updating a translation
 */
export interface UpdateTranslationInput {
  text?: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

/**
 * Convert DbTranslation to Translation
 */
function mapDbToTranslation(db: DbTranslation): Translation {
  return {
    id: db.id,
    transcriptionId: db.transcription_id,
    text: db.text,
    sourceLanguage: db.source_language,
    targetLanguage: db.target_language,
    status: db.status,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Translation model for database operations
 */
export class TranslationModel {
  /**
   * Generate a unique ID for a new translation
   */
  static generateId(): string {
    return `transl-${crypto.randomUUID()}`;
  }

  /**
   * Find a translation by ID
   */
  static findById(id: string): Translation | null {
    const db = getDatabase();
    const translation = db
      .prepare(
        `
      SELECT * FROM translations WHERE id = ?
    `,
      )
      .get(id) as DbTranslation | undefined;

    return translation ? mapDbToTranslation(translation) : null;
  }

  /**
   * Find translations by transcription ID
   */
  static findByTranscriptionId(transcriptionId: string): Translation[] {
    const db = getDatabase();
    const translations = db
      .prepare(
        `
      SELECT * FROM translations 
      WHERE transcription_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(transcriptionId) as DbTranslation[];

    return translations.map(mapDbToTranslation);
  }

  /**
   * Find translation by transcription ID and target language
   */
  static findByTranscriptionAndLanguage(
    transcriptionId: string,
    targetLanguage: string,
  ): Translation | null {
    const db = getDatabase();
    const translation = db
      .prepare(
        `
      SELECT * FROM translations 
      WHERE transcription_id = ? AND target_language = ?
    `,
      )
      .get(transcriptionId, targetLanguage) as DbTranslation | undefined;

    return translation ? mapDbToTranslation(translation) : null;
  }

  /**
   * Create a new translation
   */
  static create(input: CreateTranslationInput): Translation {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const translation: DbTranslation = {
      id,
      transcription_id: input.transcriptionId,
      text: input.text,
      source_language: input.sourceLanguage,
      target_language: input.targetLanguage,
      status: input.status || "NOT_STARTED",
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
      INSERT INTO translations (
        id, transcription_id, text, source_language, target_language,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      translation.id,
      translation.transcription_id,
      translation.text,
      translation.source_language,
      translation.target_language,
      translation.status,
      translation.created_at,
      translation.updated_at,
    );

    return mapDbToTranslation(translation);
  }

  /**
   * Update a translation
   */
  static update(id: string, input: UpdateTranslationInput): Translation | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the translation exists
    const existingTranslation = this.findById(id);
    if (!existingTranslation) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.text !== undefined) updates.text = input.text;
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
      UPDATE translations
      SET ${setClause}
      WHERE id = ?
    `,
    ).run(...values);

    // Return updated translation
    return this.findById(id);
  }

  /**
   * Delete a translation
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM translations WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Update translation status
   */
  static updateStatus(
    id: string,
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
  ): Translation | null {
    return this.update(id, { status });
  }

  /**
   * Find pending translations
   */
  static findPending(): Translation[] {
    const db = getDatabase();
    const translations = db
      .prepare(
        `
      SELECT * FROM translations 
      WHERE status IN ('NOT_STARTED', 'IN_PROGRESS')
      ORDER BY created_at ASC
    `,
      )
      .all() as DbTranslation[];

    return translations.map(mapDbToTranslation);
  }
}
