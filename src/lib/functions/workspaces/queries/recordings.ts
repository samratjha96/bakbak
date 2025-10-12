/**
 * ABOUTME: Workspace recordings query server functions
 * ABOUTME: Fetches recordings that belong to specific workspaces
 */
import { createServerFn } from "@tanstack/react-start";
import { WorkspaceModel, RecordingModel } from "~/database/models";
import { isAuthenticated, getCurrentUserId } from "~/database/connection";

/**
 * Server function to fetch workspace recordings
 */
export const fetchWorkspaceRecordings = createServerFn({ method: "GET" })
  .inputValidator((input: { workspaceId: string }) => input)
  .handler(async ({ data }) => {
    const authed = await isAuthenticated();
    if (!authed) throw new Error("Unauthorized");

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const { workspaceId } = data;

    try {
      // Check if user has access to workspace
      if (!WorkspaceModel.hasAccess(workspaceId, userId)) {
        throw new Error("Forbidden");
      }

      const recordings = RecordingModel.findByWorkspaceId(workspaceId);
      return recordings;
    } catch (error) {
      console.error("Error fetching workspace recordings:", error);
      throw error;
    }
  });