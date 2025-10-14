/**
 * ABOUTME: Workspace data fetching server functions
 * ABOUTME: Handles retrieving workspace details and user membership info
 */
import { createServerFn } from "@tanstack/react-start";
import { WorkspaceModel } from "~/database/models";
import { isAuthenticated, getCurrentUserId } from "~/database/connection";

/**
 * Server function to fetch user's workspaces
 */
export const fetchUserWorkspaces = createServerFn({ method: "GET" }).handler(
  async () => {
    const authed = await isAuthenticated();
    if (!authed) return [];

    try {
      const userId = await getCurrentUserId();
      if (!userId) return [];

      const workspaces = WorkspaceModel.findByUserId(userId);

      // Add member count and user role for each workspace
      const workspacesWithDetails = workspaces.map((workspace) => {
        const members = WorkspaceModel.getMembers(workspace.id);
        const userMembership = WorkspaceModel.getMembership(
          workspace.id,
          userId,
        );

        return {
          ...workspace,
          memberCount: members.length,
          userRole: userMembership?.role || "viewer",
        };
      });

      return workspacesWithDetails;
    } catch (error) {
      // Silently return empty array on error - workspace feature is optional
      return [];
    }
  },
);

/**
 * Server function to fetch workspace details
 */
export const fetchWorkspaceDetails = createServerFn({ method: "GET" })
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

      const workspace = WorkspaceModel.findById(workspaceId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      // Get user's membership info and member count
      const membership = WorkspaceModel.getMembership(workspaceId, userId);
      const members = WorkspaceModel.getMembers(workspaceId);

      return {
        workspace,
        userRole: membership?.role,
        memberCount: members.length,
        members: members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          status: member.status,
          joinedAt: member.joinedAt,
        })),
      };
    } catch (error) {
      console.error("Error fetching workspace details:", error);
      throw error;
    }
  });
