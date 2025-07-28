import { getDatabase } from "../connection";
import crypto from "crypto";

/**
 * Interface for RecordingSharing DB data
 */
interface DbRecordingSharing {
  id: string;
  recording_id: string;
  user_id: string; // Owner of the recording
  shared_with_user_id: string; // User with whom the recording is shared
  permission_level: "view" | "edit" | "admin";
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Interface for RecordingSharing data in application code
 */
export interface RecordingSharing {
  id: string;
  recordingId: string;
  userId: string; // Owner of the recording
  sharedWithUserId: string; // User with whom the recording is shared
  permissionLevel: "view" | "edit" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a recording sharing
 */
export interface CreateRecordingSharingInput {
  recordingId: string;
  userId: string;
  sharedWithUserId: string;
  permissionLevel?: "view" | "edit" | "admin";
}

/**
 * Input for updating a recording sharing
 */
export interface UpdateRecordingSharingInput {
  permissionLevel: "view" | "edit" | "admin";
}

/**
 * Convert DbRecordingSharing to RecordingSharing
 */
function mapDbToRecordingSharing(db: DbRecordingSharing): RecordingSharing {
  return {
    id: db.id,
    recordingId: db.recording_id,
    userId: db.user_id,
    sharedWithUserId: db.shared_with_user_id,
    permissionLevel: db.permission_level,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * RecordingSharing model for database operations
 */
export class RecordingSharingModel {
  /**
   * Generate a unique ID for a new sharing
   */
  static generateId(): string {
    return `share-${crypto.randomUUID()}`;
  }

  /**
   * Find a sharing by ID
   */
  static findById(id: string): RecordingSharing | null {
    const db = getDatabase();
    const sharing = db
      .prepare(
        `
      SELECT * FROM recording_sharing WHERE id = ?
    `,
      )
      .get(id) as DbRecordingSharing | undefined;

    return sharing ? mapDbToRecordingSharing(sharing) : null;
  }

  /**
   * Find sharings by recording ID
   */
  static findByRecordingId(recordingId: string): RecordingSharing[] {
    const db = getDatabase();
    const sharings = db
      .prepare(
        `
      SELECT * FROM recording_sharing 
      WHERE recording_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(recordingId) as DbRecordingSharing[];

    return sharings.map(mapDbToRecordingSharing);
  }

  /**
   * Find sharings by user ID (recordings shared by this user)
   */
  static findByUserId(userId: string): RecordingSharing[] {
    const db = getDatabase();
    const sharings = db
      .prepare(
        `
      SELECT * FROM recording_sharing 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(userId) as DbRecordingSharing[];

    return sharings.map(mapDbToRecordingSharing);
  }

  /**
   * Find sharings with a user (recordings shared with this user)
   */
  static findBySharedWithUserId(userId: string): RecordingSharing[] {
    const db = getDatabase();
    const sharings = db
      .prepare(
        `
      SELECT * FROM recording_sharing 
      WHERE shared_with_user_id = ?
      ORDER BY created_at DESC
    `,
      )
      .all(userId) as DbRecordingSharing[];

    return sharings.map(mapDbToRecordingSharing);
  }

  /**
   * Find a specific sharing by recording ID and shared user ID
   */
  static findByRecordingAndUser(
    recordingId: string,
    sharedWithUserId: string,
  ): RecordingSharing | null {
    const db = getDatabase();
    const sharing = db
      .prepare(
        `
      SELECT * FROM recording_sharing 
      WHERE recording_id = ? AND shared_with_user_id = ?
    `,
      )
      .get(recordingId, sharedWithUserId) as DbRecordingSharing | undefined;

    return sharing ? mapDbToRecordingSharing(sharing) : null;
  }

  /**
   * Create a new sharing
   */
  static create(input: CreateRecordingSharingInput): RecordingSharing {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const sharing: DbRecordingSharing = {
      id,
      recording_id: input.recordingId,
      user_id: input.userId,
      shared_with_user_id: input.sharedWithUserId,
      permission_level: input.permissionLevel || "view",
      created_at: now,
      updated_at: now,
    };

    try {
      db.prepare(
        `
        INSERT INTO recording_sharing (
          id, recording_id, user_id, shared_with_user_id,
          permission_level, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        sharing.id,
        sharing.recording_id,
        sharing.user_id,
        sharing.shared_with_user_id,
        sharing.permission_level,
        sharing.created_at,
        sharing.updated_at,
      );

      return mapDbToRecordingSharing(sharing);
    } catch (error) {
      // Handle unique constraint violation
      if ((error as Error).message.includes("UNIQUE constraint failed")) {
        const existingSharing = this.findByRecordingAndUser(
          input.recordingId,
          input.sharedWithUserId,
        );
        if (existingSharing) {
          return existingSharing;
        }
      }
      throw error;
    }
  }

  /**
   * Update a sharing
   */
  static update(
    id: string,
    input: UpdateRecordingSharingInput,
  ): RecordingSharing | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the sharing exists
    const existingSharing = this.findById(id);
    if (!existingSharing) return null;

    db.prepare(
      `
      UPDATE recording_sharing
      SET permission_level = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(input.permissionLevel, now, id);

    // Return updated sharing
    return this.findById(id);
  }

  /**
   * Delete a sharing
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM recording_sharing WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  /**
   * Check if user has access to a recording
   */
  static hasAccess(
    recordingId: string,
    userId: string,
    requiredPermission: "view" | "edit" | "admin" = "view",
  ): boolean {
    const db = getDatabase();

    // First check if the user is the owner of the recording
    const isOwner = db
      .prepare(
        `
      SELECT 1 FROM recordings WHERE id = ? AND user_id = ?
    `,
      )
      .get(recordingId, userId);

    if (isOwner) return true;

    // Then check if the recording is shared with the user with sufficient permissions
    const permissionLevels: Record<string, number> = {
      view: 1,
      edit: 2,
      admin: 3,
    };

    const requiredLevel = permissionLevels[requiredPermission];

    const sharing = db
      .prepare(
        `
      SELECT permission_level FROM recording_sharing 
      WHERE recording_id = ? AND shared_with_user_id = ?
    `,
      )
      .get(recordingId, userId) as
      | { permission_level: "view" | "edit" | "admin" }
      | undefined;

    if (!sharing) return false;

    const actualLevel = permissionLevels[sharing.permission_level];
    return actualLevel >= requiredLevel;
  }
}
