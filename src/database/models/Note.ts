import { getDatabase } from "../connection";
// Notes are embedded in recordings table; define a local DB type for mapping
interface DbNote {
  id: string;
  recording_id: string;
  user_id: string;
  content: string;
  timestamp?: number | null;
  created_at: string;
  updated_at: string;
}
import crypto from "crypto";

/**
 * Interface for note data in application code
 */
export interface Note {
  id: string;
  recordingId: string;
  userId: string;
  content: string;
  timestamp?: number; // optional position in recording (in seconds)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a note
 */
export interface CreateNoteInput {
  recordingId: string;
  userId: string;
  content: string;
  timestamp?: number;
}

/**
 * Input for updating a note
 */
export interface UpdateNoteInput {
  content?: string;
  timestamp?: number | null;
}

/**
 * Convert DbNote to Note
 */
function mapDbToNote(db: DbNote): Note {
  return {
    id: db.id,
    recordingId: db.recording_id,
    userId: db.user_id,
    content: db.content,
    timestamp: db.timestamp ?? undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Note model for database operations
 */
export class NoteModel {
  /**
   * Generate a unique ID for a new note
   */
  static generateId(): string {
    return `note-${crypto.randomUUID()}`;
  }

  /**
   * Find a note by ID
   */
  static findById(id: string): Note | null {
    const db = getDatabase();
    const note = db
      .prepare(
        `
      SELECT * FROM notes WHERE id = ?
    `,
      )
      .get(id) as DbNote | undefined;

    return note ? mapDbToNote(note) : null;
  }

  /**
   * Find notes by recording ID
   */
  static findByRecordingId(recordingId: string): Note[] {
    const db = getDatabase();
    const notes = db
      .prepare(
        `
      SELECT * FROM notes 
      WHERE recording_id = ?
      ORDER BY timestamp ASC NULLS LAST, created_at DESC
    `,
      )
      .all(recordingId) as DbNote[];

    return notes.map(mapDbToNote);
  }

  /**
   * Find notes by user ID
   */
  static findByUserId(userId: string): Note[] {
    const db = getDatabase();
    const notes = db
      .prepare(
        `
      SELECT * FROM notes 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(userId) as DbNote[];

    return notes.map(mapDbToNote);
  }

  /**
   * Create a new note
   */
  static create(input: CreateNoteInput): Note {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const note: DbNote = {
      id,
      recording_id: input.recordingId,
      user_id: input.userId,
      content: input.content,
      timestamp: input.timestamp,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
      INSERT INTO notes (
        id, recording_id, user_id, content, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      note.id,
      note.recording_id,
      note.user_id,
      note.content,
      note.timestamp,
      note.created_at,
      note.updated_at,
    );

    return mapDbToNote(note);
  }

  /**
   * Update a note
   */
  static update(id: string, input: UpdateNoteInput): Note | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the note exists
    const existingNote = this.findById(id);
    if (!existingNote) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.content !== undefined) updates.content = input.content;
    if (input.timestamp !== undefined) updates.timestamp = input.timestamp;

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
      UPDATE notes
      SET ${setClause}
      WHERE id = ?
    `,
    ).run(...values);

    // Return updated note
    return this.findById(id);
  }

  /**
   * Delete a note
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Find notes by text search
   */
  static search(query: string): Note[] {
    const db = getDatabase();
    const searchPattern = `%${query}%`;

    const notes = db
      .prepare(
        `
      SELECT * FROM notes 
      WHERE content LIKE ?
      ORDER BY created_at DESC
    `,
      )
      .all(searchPattern) as DbNote[];

    return notes.map(mapDbToNote);
  }

  /**
   * Count notes by recording ID
   */
  static countByRecordingId(recordingId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM notes WHERE recording_id = ?")
      .get(recordingId) as { count: number };
    return result.count;
  }
}
