/**
 * Recording creation server function
 * Follows TanStack Start best practices for 2024
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { RecordingModel } from "~/database/models";
import { getCurrentUserId, isAuthenticated } from "~/database/connection";
import { randomUUID } from "crypto";

// Input validation schema using Zod (TanStack Start best practice)
const CreateRecordingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  language: z.string().min(2, "Language code required"),
  workspaceId: z.string().uuid("Invalid workspace ID"),
  duration: z.number().min(0, "Duration must be positive").optional(),
  filePath: z.string().optional(),
  sourceType: z
    .enum(["SELF_RECORDED", "UPLOADED", "IMPORTED"])
    .default("SELF_RECORDED"),
  audioUrl: z.string().url("Invalid audio URL").optional(),
  notes: z
    .object({
      content: z.string(),
    })
    .optional(),
});

/**
 * Create a new recording
 *
 * Follows TanStack Start patterns:
 * - Simple Zod validation
 * - Direct error throwing (no custom error classes)
 * - Simple return values (no wrapped responses)
 * - Clean, minimal implementation
 */
export const createRecording = createServerFn({ method: "POST" })
  .inputValidator(CreateRecordingSchema)
  .handler(async ({ data }) => {
    // Authentication check
    const authed = await isAuthenticated();
    if (!authed) {
      throw new Error("Authentication required");
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("User ID not found");
    }

    try {
      // Create recording using the model
      const recording = await RecordingModel.create({
        userId,
        title: data.title,
        description: data.description,
        filePath:
          data.filePath ||
          `recordings/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webm`,
        language: data.language,
        duration: data.duration || 0,
        workspaceId: data.workspaceId,
        status: "processing",
        // Handle notes if provided
        metadata: data.notes ? { notes: data.notes } : undefined,
      });

      // Return simple data (TanStack Start best practice)
      return {
        id: recording.id,
        title: recording.title,
        description: recording.description,
        language: recording.language,
        workspaceId: recording.workspaceId,
        userId: recording.userId,
        duration: recording.duration,
        status: recording.status,
        createdAt: recording.createdAt.toISOString(),
        // Include audioUrl if provided in input
        audioUrl: data.audioUrl,
        // Include notes if they exist in metadata
        notes: recording.metadata?.notes,
        // Include other useful fields
        filePath: recording.filePath,
      };
    } catch (error) {
      // Simple error handling (TanStack Start best practice)
      if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint")) {
          throw new Error("A recording with this title already exists");
        }
        if (error.message.includes("FOREIGN KEY constraint")) {
          throw new Error("Invalid workspace");
        }
      }

      // Re-throw with user-friendly message
      throw new Error("Failed to create recording. Please try again.");
    }
  });
