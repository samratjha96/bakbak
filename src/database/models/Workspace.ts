import { getDatabase } from "../connection";
import { DbWorkspace, DbWorkspaceMembership } from "../types";
import crypto from "crypto";

/**
 * Interface for workspace data in application code
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  avatarUrl?: string;
  settings: Record<string, any>;
  storageQuota: number;
  storageUsed: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for workspace membership data
 */
export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  status: "active" | "pending";
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a workspace
 */
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  slug: string;
  createdBy: string;
}

/**
 * Input for updating a workspace
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Record<string, any>;
}

/**
 * Input for creating a workspace membership
 */
export interface CreateWorkspaceMembershipInput {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  invitedBy?: string;
}

/**
 * Convert DbWorkspace to Workspace
 */
function mapDbToWorkspace(db: DbWorkspace): Workspace {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    slug: db.slug,
    avatarUrl: db.avatar_url,
    settings: db.settings ? JSON.parse(db.settings) : {},
    storageQuota: db.storage_quota,
    storageUsed: db.storage_used,
    createdBy: db.created_by,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Convert DbWorkspaceMembership to WorkspaceMembership
 */
function mapDbToMembership(db: DbWorkspaceMembership): WorkspaceMembership {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    userId: db.user_id,
    role: db.role,
    status: db.status,
    invitedBy: db.invited_by,
    invitedAt: db.invited_at ? new Date(db.invited_at) : undefined,
    joinedAt: db.joined_at ? new Date(db.joined_at) : undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Workspace model for database operations
 */
export class WorkspaceModel {
  /**
   * Generate a unique ID for a new workspace
   */
  static generateId(): string {
    return `ws-${crypto.randomUUID()}`;
  }

  /**
   * Generate a unique ID for a workspace membership
   */
  static generateMembershipId(): string {
    return `wsm-${crypto.randomUUID()}`;
  }

  /**
   * Find a workspace by ID
   */
  static findById(id: string): Workspace | null {
    const db = getDatabase();
    const workspace = db
      .prepare("SELECT * FROM workspaces WHERE id = ?")
      .get(id) as DbWorkspace | undefined;

    return workspace ? mapDbToWorkspace(workspace) : null;
  }

  /**
   * Find a workspace by slug
   */
  static findBySlug(slug: string): Workspace | null {
    const db = getDatabase();
    const workspace = db
      .prepare("SELECT * FROM workspaces WHERE slug = ?")
      .get(slug) as DbWorkspace | undefined;

    return workspace ? mapDbToWorkspace(workspace) : null;
  }

  /**
   * Find all workspaces for a user
   */
  static findByUserId(userId: string): Workspace[] {
    const db = getDatabase();
    const workspaces = db
      .prepare(`
        SELECT w.* FROM workspaces w
        JOIN workspace_memberships wm ON w.id = wm.workspace_id
        WHERE wm.user_id = ? AND wm.status = 'active'
        ORDER BY w.created_at DESC
      `)
      .all(userId) as DbWorkspace[];

    return workspaces.map(mapDbToWorkspace);
  }

  /**
   * Create a new workspace
   */
  static create(input: CreateWorkspaceInput): Workspace {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateId();

    const workspace: DbWorkspace = {
      id,
      name: input.name,
      description: input.description,
      slug: input.slug,
      avatar_url: undefined,
      settings: "{}",
      storage_quota: 1073741824, // 1GB
      storage_used: 0,
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO workspaces (
        id, name, description, slug, avatar_url, settings,
        storage_quota, storage_used, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workspace.id,
      workspace.name,
      workspace.description,
      workspace.slug,
      workspace.avatar_url,
      workspace.settings,
      workspace.storage_quota,
      workspace.storage_used,
      workspace.created_by,
      workspace.created_at,
      workspace.updated_at,
    );

    return mapDbToWorkspace(workspace);
  }

  /**
   * Update a workspace
   */
  static update(id: string, input: UpdateWorkspaceInput): Workspace | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the workspace exists
    const existingWorkspace = this.findById(id);
    if (!existingWorkspace) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;
    if (input.settings !== undefined) updates.settings = JSON.stringify(input.settings);

    // Build SET clause for SQL
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    // Build values array for SQL
    const values = Object.values(updates);
    values.push(id); // Add id for WHERE clause

    // Execute update
    db.prepare(`
      UPDATE workspaces
      SET ${setClause}
      WHERE id = ?
    `).run(...values);

    // Return updated workspace
    return this.findById(id);
  }

  /**
   * Delete a workspace
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Create a workspace membership
   */
  static createMembership(input: CreateWorkspaceMembershipInput): WorkspaceMembership {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = this.generateMembershipId();

    const membership: DbWorkspaceMembership = {
      id,
      workspace_id: input.workspaceId,
      user_id: input.userId,
      role: input.role,
      status: "active",
      invited_by: input.invitedBy,
      invited_at: input.invitedBy ? now : undefined,
      joined_at: now,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO workspace_memberships (
        id, workspace_id, user_id, role, status, invited_by,
        invited_at, joined_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      membership.id,
      membership.workspace_id,
      membership.user_id,
      membership.role,
      membership.status,
      membership.invited_by,
      membership.invited_at,
      membership.joined_at,
      membership.created_at,
      membership.updated_at,
    );

    return mapDbToMembership(membership);
  }

  /**
   * Get workspace members
   */
  static getMembers(workspaceId: string): WorkspaceMembership[] {
    const db = getDatabase();
    const memberships = db
      .prepare(`
        SELECT * FROM workspace_memberships
        WHERE workspace_id = ? AND status = 'active'
        ORDER BY created_at ASC
      `)
      .all(workspaceId) as DbWorkspaceMembership[];

    return memberships.map(mapDbToMembership);
  }

  /**
   * Get user's membership in a workspace
   */
  static getMembership(workspaceId: string, userId: string): WorkspaceMembership | null {
    const db = getDatabase();
    const membership = db
      .prepare(`
        SELECT * FROM workspace_memberships
        WHERE workspace_id = ? AND user_id = ?
      `)
      .get(workspaceId, userId) as DbWorkspaceMembership | undefined;

    return membership ? mapDbToMembership(membership) : null;
  }

  /**
   * Check if user has access to workspace
   */
  static hasAccess(workspaceId: string, userId: string): boolean {
    const membership = this.getMembership(workspaceId, userId);
    return membership !== null && membership.status === "active";
  }

  /**
   * Remove member from workspace
   */
  static removeMember(workspaceId: string, userId: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?")
      .run(workspaceId, userId);
    return result.changes > 0;
  }
}