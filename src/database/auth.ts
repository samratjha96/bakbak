import { getDatabase } from "./connection";
import { UserProfileModel } from "./models/UserProfile";

/**
 * Auth-related utilities for database operations
 *
 * This module provides utilities for working with user authentication
 * and connecting better-auth users with app-specific user data
 */

/**
 * Get or create a user profile for the current user
 *
 * @param userId The ID of the authenticated user from better-auth
 * @returns The user profile object
 */
export async function getOrCreateUserProfile(userId: string) {
  try {
    // First try to find an existing profile
    let userProfile = UserProfileModel.findByUserId(userId);

    // If no profile exists, create a new one with defaults
    if (!userProfile) {
      userProfile = UserProfileModel.create({
        userId,
        preferredLanguage: "en", // Default to English
        learningLanguages: [],
        theme: "light",
      });
    }

    // Update last login time
    UserProfileModel.updateLastLogin(userId);

    return userProfile;
  } catch (error) {
    console.error("Error getting or creating user profile:", error);
    throw new Error("Failed to get or create user profile");
  }
}

/**
 * Check if the authenticated user can access a specific recording
 *
 * @param userId The ID of the authenticated user
 * @param recordingId The ID of the recording to check access for
 * @param requiredPermission The required permission level ('view', 'edit', 'admin')
 * @returns boolean indicating if the user has the required access
 */
export function canAccessRecording(
  userId: string,
  recordingId: string,
  requiredPermission: "view" | "edit" | "admin" = "view",
): boolean {
  const db = getDatabase();

  // Check if user is the owner
  const isOwner = db
    .prepare(
      `
    SELECT 1 FROM recordings WHERE id = ? AND user_id = ?
  `,
    )
    .get(recordingId, userId);

  if (isOwner) return true;

  // Permission hierarchy
  const permissionLevels: Record<string, number> = {
    view: 1,
    edit: 2,
    admin: 3,
  };

  const requiredLevel = permissionLevels[requiredPermission];

  // Check shared access
  const sharing = db
    .prepare(
      `
    SELECT permission_level FROM recording_sharing 
    WHERE recording_id = ? AND shared_with_user_id = ?
  `,
    )
    .get(recordingId, userId) as { permission_level: string } | undefined;

  if (!sharing) return false;

  const actualLevel = permissionLevels[sharing.permission_level];
  return actualLevel >= requiredLevel;
}
