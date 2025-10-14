/**
 * ABOUTME: Recording deletion server functions
 * ABOUTME: Handles deleting recordings from both database and S3 storage
 */
import { createServerFn } from "@tanstack/react-start";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { s3 } from "~/lib/s3";

export const deleteRecording = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const authed = await isAuthenticated();
    if (!authed) {
      throw new Error("Not authenticated");
    }
    const userId = await getCurrentUserId();

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
