/**
 * ABOUTME: Recording basic field update server functions
 * ABOUTME: Handles updating recording metadata like title, description, language, and notes
 */
import { createServerFn } from "@tanstack/react-start";
import { Notes } from "~/types/recording";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";

export const updateRecording = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      title?: string;
      description?: string;
      language?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const authed = await isAuthenticated();
    if (!authed) {
      throw new Error("Not authenticated");
    }
    const userId = await getCurrentUserId();
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

export const updateRecordingNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes: Partial<Notes> }) => data)
  .handler(async ({ data }) => {
    const db = getDatabase();
    const authed = await isAuthenticated();
    if (!authed) {
      throw new Error("Not authenticated");
    }
    const userId = await getCurrentUserId();
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