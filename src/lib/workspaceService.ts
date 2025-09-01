import { WorkspaceModel } from "~/database/models";
import crypto from "crypto";

/**
 * Service for managing workspace lifecycle events
 */
export class WorkspaceService {
  /**
   * Ensures a user has a personal workspace, creating one if it doesn't exist.
   * This is idempotent - safe to call multiple times for the same user.
   */
  static async ensurePersonalWorkspace(
    userId: string,
    userEmail?: string,
  ): Promise<string> {
    const personalWorkspaceId = `personal-${userId}`;

    // Check if workspace already exists
    const existingWorkspace = WorkspaceModel.findById(personalWorkspaceId);
    if (existingWorkspace) {
      // Workspace already exists, return its ID
      return existingWorkspace.id;
    }

    // Create a unique slug for the workspace
    const baseSlug = userEmail
      ? userEmail
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
      : "personal";
    const uniqueSuffix = crypto.randomBytes(3).toString("hex");
    const slug = `${baseSlug}-${uniqueSuffix}`;

    try {
      // Create the personal workspace with the expected ID pattern
      const workspace = WorkspaceModel.createWithId({
        id: personalWorkspaceId,
        name: "Personal Workspace",
        description: "Your personal workspace for private recordings",
        slug,
        createdBy: userId,
      });

      // Create owner membership for the user
      WorkspaceModel.createMembership({
        workspaceId: workspace.id,
        userId,
        role: "owner",
      });

      console.log(
        `Created personal workspace for user ${userId}: ${workspace.id}`,
      );
      return workspace.id;
    } catch (error) {
      console.error(
        `Error creating personal workspace for user ${userId}:`,
        error,
      );

      // If creation failed, check if workspace was created by another process
      const recheckWorkspace = WorkspaceModel.findById(personalWorkspaceId);
      if (recheckWorkspace) {
        return recheckWorkspace.id;
      }

      throw error;
    }
  }

  /**
   * Handles user signup - ensures they have a personal workspace
   */
  static async onUserSignup(userId: string, userEmail?: string): Promise<void> {
    try {
      await this.ensurePersonalWorkspace(userId, userEmail);
    } catch (error) {
      console.error(
        `Failed to create workspace for new user ${userId}:`,
        error,
      );
      // Don't throw - we don't want to break user signup if workspace creation fails
    }
  }

  /**
   * Handles user signin - ensures existing users have a personal workspace
   * This provides a seamless transition for existing users who didn't have workspaces
   */
  static async onUserSignin(userId: string, userEmail?: string): Promise<void> {
    try {
      await this.ensurePersonalWorkspace(userId, userEmail);
    } catch (error) {
      console.error(`Failed to ensure workspace for user ${userId}:`, error);
      // Don't throw - we don't want to break user signin if workspace creation fails
    }
  }
}
