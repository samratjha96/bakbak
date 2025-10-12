/**
 * ABOUTME: Workspace invitation management server functions
 * ABOUTME: Handles inviting users to workspaces with role-based permissions
 */
import { createServerFn } from "@tanstack/react-start";
import { WorkspaceModel } from "~/database/models";
import { isAuthenticated, getCurrentUserId } from "~/database/connection";

/**
 * Server function to invite user to workspace
 */
export const inviteUserToWorkspace = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      workspaceId: string;
      email: string;
      role: "owner" | "editor" | "viewer";
    }) => input,
  )
  .handler(async ({ data }) => {
    const authed = await isAuthenticated();
    if (!authed) throw new Error("Unauthorized");

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Unauthorized");

    const { workspaceId, email, role } = data;

    try {
      // Check if user has permission to invite (owner or editor)
      const membership = WorkspaceModel.getMembership(workspaceId, userId);
      if (
        !membership ||
        membership.status !== "active" ||
        membership.role === "viewer"
      ) {
        throw new Error("Forbidden - insufficient permissions");
      }

      // Only owners can invite other owners or editors
      if (
        (role === "owner" || role === "editor") &&
        membership.role !== "owner"
      ) {
        throw new Error("Only workspace owners can invite owners or editors");
      }

      // For MVP, just return success message
      // In full implementation, this would create pending membership and send email
      return {
        success: true,
        message: `Invitation would be sent to ${email} with role ${role}`,
        invitationId: `inv-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      console.error("Error sending invitation:", error);
      throw error;
    }
  });