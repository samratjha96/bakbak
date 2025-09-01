import { createServerFn } from "@tanstack/react-start";
import { auth } from "./auth";
import { WorkspaceModel, RecordingModel } from "~/database/models";

/**
 * Server function to fetch user's workspaces
 */
export const fetchUserWorkspaces = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(),
      });

      if (!session?.user) {
        // Return empty array instead of throwing error for unauthenticated users
        return [];
      }

      const workspaces = WorkspaceModel.findByUserId(session.user.id);

      // Add member count and user role for each workspace
      const workspacesWithDetails = workspaces.map((workspace) => {
        const members = WorkspaceModel.getMembers(workspace.id);
        const userMembership = WorkspaceModel.getMembership(
          workspace.id,
          session.user.id,
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
  .validator((input: { workspaceId: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const { workspaceId } = data;

      // Check if user has access to workspace
      if (!WorkspaceModel.hasAccess(workspaceId, session.user.id)) {
        throw new Error("Forbidden");
      }

      const workspace = WorkspaceModel.findById(workspaceId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      // Get user's membership info and member count
      const membership = WorkspaceModel.getMembership(
        workspaceId,
        session.user.id,
      );
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

/**
 * Server function to fetch workspace recordings
 */
export const fetchWorkspaceRecordings = createServerFn({ method: "GET" })
  .validator((input: { workspaceId: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const { workspaceId } = data;

      // Check if user has access to workspace
      if (!WorkspaceModel.hasAccess(workspaceId, session.user.id)) {
        throw new Error("Forbidden");
      }

      const recordings = RecordingModel.findByWorkspaceId(workspaceId);
      return recordings;
    } catch (error) {
      console.error("Error fetching workspace recordings:", error);
      throw error;
    }
  });

/**
 * Server function to create a new workspace
 */
export const createWorkspace = createServerFn({ method: "POST" })
  .validator((input: { name: string; description?: string }) => input)
  .handler(async ({ data }) => {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

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
        createdBy: session.user.id,
      });

      // Create owner membership
      WorkspaceModel.createMembership({
        workspaceId: workspace.id,
        userId: session.user.id,
        role: "owner",
      });

      return workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      throw error;
    }
  });

/**
 * Server function to invite user to workspace
 */
export const inviteUserToWorkspace = createServerFn({ method: "POST" })
  .validator(
    (input: {
      workspaceId: string;
      email: string;
      role: "owner" | "editor" | "viewer";
    }) => input,
  )
  .handler(async ({ data }) => {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

    const { workspaceId, email, role } = data;

    try {
      // Check if user has permission to invite (owner or editor)
      const membership = WorkspaceModel.getMembership(
        workspaceId,
        session.user.id,
      );
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
