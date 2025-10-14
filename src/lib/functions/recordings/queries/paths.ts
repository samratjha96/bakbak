/**
 * ABOUTME: Recording file path and URL generation server functions
 * ABOUTME: Handles S3 paths and presigned URLs for audio file access
 */
import { createServerFn } from "@tanstack/react-start";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { getS3Url } from "~/lib/aws-config";
import { s3 } from "~/lib/s3";

/**
 * Get the raw S3 path for a recording (for AWS services like Transcribe)
 */
export const getRecordingPath = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const authed = await isAuthenticated();
    if (!authed) {
      throw new Error("Not authenticated");
    }
    const userId = await getCurrentUserId();

    // Check if recording exists and belongs to user
    const recording = db
      .prepare(
        `SELECT id, file_path FROM recordings WHERE id = ? AND user_id = ?`,
      )
      .get(id, userId) as { id: string; file_path: string } | undefined;

    if (!recording) {
      throw new Error(
        "Recording not found or you do not have permission to access it.",
      );
    }

    // Return S3 URI format for AWS services
    const s3Uri = `s3://${process.env.AWS_S3_BUCKET || "your-bucket"}/${recording.file_path}`;

    return {
      s3Uri,
      filePath: recording.file_path,
    };
  });

/**
 * Generate a presigned URL for downloading a recording
 */
export const getRecordingPresignedUrl = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = getDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if recording exists and belongs to user
    const recording = db
      .prepare(
        `SELECT id, file_path, language, duration FROM recordings WHERE id = ? AND user_id = ?`,
      )
      .get(id, userId) as
      | {
          id: string;
          file_path: string;
          language: string | null;
          duration: number;
        }
      | undefined;

    if (!recording) {
      throw new Error(
        "Recording not found or you do not have permission to access it.",
      );
    }

    try {
      // Generate a presigned URL with 15 minute expiration (900 seconds)
      const presignedUrl = await s3.getSignedUrl(recording.file_path, 900);

      // Also generate a direct S3 URL as fallback
      const directUrl = getS3Url(recording.file_path);

      return {
        url: presignedUrl,
        directUrl: directUrl,
        expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new Error("Failed to generate audio URL. Please try again.");
    }
  });
