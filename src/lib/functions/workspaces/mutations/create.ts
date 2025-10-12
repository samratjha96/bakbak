/**
 * ABOUTME: Workspace creation and initialization server functions
 * ABOUTME: Handles creating new workspaces and ensuring user workspaces exist
 */
import { createServerFn } from "@tanstack/react-start";
import { WorkspaceModel } from "~/database/models";
import { isAuthenticated, getCurrentUserId } from "~/database/connection";
import { WorkspaceService } from "~/lib/workspaceService";

/**
 * Server function to ensure the current user has a personal workspace
 * This can be called from the frontend to ensure workspace exists
 */
export const ensureUserWorkspace = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const authed = await isAuthenticated();
      if (!authed) {
        return { success: false, error: "Not authenticated" };
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: "Not authenticated" };
      }

      const workspaceId = await WorkspaceService.ensurePersonalWorkspace(
        userId,
        undefined, // We don't have access to email here, but that's ok
      );

      return {
        success: true,
        workspaceId,
        message: "Personal workspace ensured",
      };
    } catch (error) {
      console.error("Error ensuring user workspace:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
);

/**
 * Server function to create a new workspace
 */
export const createWorkspace = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; description?: string }) => input)
  .handler(async ({ data }) => {
    const authed = await isAuthenticated();
    if (!authed) throw new Error("Unauthorized");

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const { name, description } = data;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Name is required");
    }

    try {
      // Generate a URL-friendly slug from the name
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substr(2, 6)}`;

      // Check if slug already exists (unlikely but safe)
      const existingWorkspace = WorkspaceModel.findBySlug(slug);
      if (existingWorkspace) {
        throw new Error("Workspace slug already exists, please try again");
      }

      const workspace = WorkspaceModel.create({
        name: name.trim(),
        description: description?.trim(),
        slug,
        createdBy: userId,
      });

      // Create owner membership
      WorkspaceModel.createMembership({
        workspaceId: workspace.id,
        userId: userId,
        role: "owner",
      });

      return workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      throw error;
    }
  });