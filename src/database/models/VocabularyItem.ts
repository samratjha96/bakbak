import { getDatabase } from "../connection";
import { DbVocabularyItem } from "../types";
import crypto from "crypto";

/**
 * Interface for vocabulary item data in application code
 */
export interface VocabularyItem {
  id: string;
  noteId: string;
  word: string;
  meaning: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a vocabulary item
 */
export interface CreateVocabularyItemInput {
  noteId: string;
  word: string;
  meaning: string;
}

/**
 * Input for updating a vocabulary item
 */
export interface UpdateVocabularyItemInput {
  word?: string;
  meaning?: string;
}

/**
 * Convert DbVocabularyItem to VocabularyItem
 */
function mapDbToVocabularyItem(db: DbVocabularyItem): VocabularyItem {
  return {
    id: db.id,
    noteId: db.note_id,
    word: db.word,
    meaning: db.meaning,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * VocabularyItem model for database operations
 */
export class VocabularyItemModel {
  /**
   * Generate a unique ID for a new vocabulary item
   */
  static generateId(): string {
    return `vocab-${crypto.randomUUID()}`;
  }

  /**
   * Find a vocabulary item by ID
   */
  static findById(id: string): VocabularyItem | null {
    const db = getDatabase();
    const vocabItem = db
      .prepare(
        `
      SELECT * FROM vocabulary_items WHERE id = ?
    `,
      )
      .get(id) as DbVocabularyItem | undefined;

    return vocabItem ? mapDbToVocabularyItem(vocabItem) : null;
  }

  /**
   * Find vocabulary items by note ID
   */
  static findByNoteId(noteId: string): VocabularyItem[] {
    const db = getDatabase();
    const vocabItems = db
      .prepare(
        `
      SELECT * FROM vocabulary_items 
      WHERE note_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(noteId) as DbVocabularyItem[];

    return vocabItems.map(mapDbToVocabularyItem);
  }

  /**
   * Search vocabulary items by word
   */
  static searchByWord(word: string): VocabularyItem[] {
    const db = getDatabase();
    const searchPattern = `%${word}%`;

    const vocabItems = db
      .prepare(
        `
      SELECT * FROM vocabulary_items 
      WHERE word LIKE ?
      ORDER BY word ASC
    `,
      )
      .all(searchPattern) as DbVocabularyItem[];

    return vocabItems.map(mapDbToVocabularyItem);
  }

  /**
   * Create a new vocabulary item
   */
  static create(input: CreateVocabularyItemInput): VocabularyItem {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const vocabItem: DbVocabularyItem = {
      id,
      note_id: input.noteId,
      word: input.word,
      meaning: input.meaning,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
      INSERT INTO vocabulary_items (
        id, note_id, word, meaning, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      vocabItem.id,
      vocabItem.note_id,
      vocabItem.word,
      vocabItem.meaning,
      vocabItem.created_at,
      vocabItem.updated_at,
    );

    return mapDbToVocabularyItem(vocabItem);
  }

  /**
   * Update a vocabulary item
   */
  static update(
    id: string,
    input: UpdateVocabularyItemInput,
  ): VocabularyItem | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the vocabulary item exists
    const existingItem = this.findById(id);
    if (!existingItem) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.word !== undefined) updates.word = input.word;
    if (input.meaning !== undefined) updates.meaning = input.meaning;

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
      UPDATE vocabulary_items
      SET ${setClause}
      WHERE id = ?
    `,
    ).run(...values);

    // Return updated vocabulary item
    return this.findById(id);
  }

  /**
   * Delete a vocabulary item
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM vocabulary_items WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  /**
   * Create multiple vocabulary items in bulk
   */
  static bulkCreate(items: CreateVocabularyItemInput[]): VocabularyItem[] {
    const db = getDatabase();
    const now = new Date().toISOString();
    const results: VocabularyItem[] = [];

    // Begin transaction
    const transaction = db.transaction((items: CreateVocabularyItemInput[]) => {
      const insertStmt = db.prepare(`
        INSERT INTO vocabulary_items (
          id, note_id, word, meaning, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const id = this.generateId();

        const vocabItem: DbVocabularyItem = {
          id,
          note_id: item.noteId,
          word: item.word,
          meaning: item.meaning,
          created_at: now,
          updated_at: now,
        };

        insertStmt.run(
          vocabItem.id,
          vocabItem.note_id,
          vocabItem.word,
          vocabItem.meaning,
          vocabItem.created_at,
          vocabItem.updated_at,
        );

        results.push(mapDbToVocabularyItem(vocabItem));
      }

      return results;
    });

    // Execute transaction
    return transaction(items);
  }
}
