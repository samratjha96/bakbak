/**
 * ABOUTME: Recording creation server functions
 * ABOUTME: Handles creating new recordings with workspace integration
 */
import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { Recording } from "~/types/recording";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";

export const createRecording = createServerFn({ method: "POST" })
  .inputValidator(
    (
      data: Omit<
        Recording,
        | "id"
        | "createdAt"
        | "isTranscribed"
        | "transcriptionStatus"
        | "isTranslated"
      > & { workspaceId: string },
    ) => data,
  )
  .handler(async ({ data }) => {
    const db = getDatabase();
    const authed = await isAuthenticated();
    if (!authed) {
      throw new Error("Not authenticated");
    }
    const userId = await getCurrentUserId();
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
      workspace_id: data.workspaceId,
      title: data.title,
      description: null,
      file_path: filePath,
      language: data.language || null,
      duration: data.duration,
      notes: notesContent,
      status: "processing" as const,
      created_at: now,
    };

    db.prepare(
      `
       INSERT INTO recordings (
         id, user_id, workspace_id, title, description, file_path, language,
         duration, notes, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     `,
    ).run(
      dbRecording.id,
      dbRecording.user_id,
      dbRecording.workspace_id,
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