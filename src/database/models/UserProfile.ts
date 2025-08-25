import { getDatabase } from "../connection";
import { DbUser } from "../types";
import crypto from "crypto";

/**
 * Interface for user profile data in the database
 */
export interface DbUserProfile {
  user_id: string;
  preferred_language?: string;
  learning_languages?: string; // JSON array of language codes
  native_language?: string;
  daily_goal?: number;
  theme: string;
  settings?: string; // JSON string
  last_login?: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Interface for user profile data in application code
 */
export interface UserProfile {
  userId: string;
  preferredLanguage?: string;
  learningLanguages: string[]; // Array of language codes
  nativeLanguage?: string;
  dailyGoal?: number;
  theme: string;
  settings: Record<string, any>;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a user profile
 */
export interface CreateUserProfileInput {
  userId: string;
  preferredLanguage?: string;
  learningLanguages?: string[];
  nativeLanguage?: string;
  dailyGoal?: number;
  theme?: string;
  settings?: Record<string, any>;
}

/**
 * Input for updating a user profile
 */
export interface UpdateUserProfileInput {
  preferredLanguage?: string;
  learningLanguages?: string[];
  nativeLanguage?: string;
  dailyGoal?: number;
  theme?: string;
  settings?: Record<string, any>;
  lastLogin?: Date;
}

/**
 * Convert DbUserProfile to UserProfile
 */
function mapDbToUserProfile(db: DbUserProfile): UserProfile {
  return {
    userId: db.user_id,
    preferredLanguage: db.preferred_language,
    learningLanguages: db.learning_languages
      ? JSON.parse(db.learning_languages)
      : [],
    nativeLanguage: db.native_language,
    dailyGoal: db.daily_goal,
    theme: db.theme || "light",
    settings: db.settings ? JSON.parse(db.settings) : {},
    lastLogin: db.last_login ? new Date(db.last_login) : undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * User Profile model for database operations
 */
export class UserProfileModel {
  /**
   * Find a user profile by ID
   */
  static findByUserId(userId: string): UserProfile | null {
    const db = getDatabase();
    const userProfile = db
      .prepare(
        `
      SELECT * FROM user_profile WHERE user_id = ?
    `,
      )
      .get(userId) as DbUserProfile | undefined;

    return userProfile ? mapDbToUserProfile(userProfile) : null;
  }

  /**
   * Create a new user profile
   */
  static create(input: CreateUserProfileInput): UserProfile {
    const db = getDatabase();
    const now = new Date().toISOString();

    const userProfile: DbUserProfile = {
      user_id: input.userId,
      preferred_language: input.preferredLanguage,
      learning_languages: input.learningLanguages
        ? JSON.stringify(input.learningLanguages)
        : undefined,
      native_language: input.nativeLanguage,
      daily_goal: input.dailyGoal,
      theme: input.theme || "light",
      settings: input.settings ? JSON.stringify(input.settings) : undefined,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
      INSERT INTO user_profile (
        user_id, preferred_language, learning_languages, native_language,
        daily_goal, theme, settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      userProfile.user_id,
      userProfile.preferred_language,
      userProfile.learning_languages,
      userProfile.native_language,
      userProfile.daily_goal,
      userProfile.theme,
      userProfile.settings,
      userProfile.created_at,
      userProfile.updated_at,
    );

    return mapDbToUserProfile(userProfile);
  }

  /**
   * Update a user profile
   */
  static update(
    userId: string,
    input: UpdateUserProfileInput,
  ): UserProfile | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // First check if the user profile exists
    const existingProfile = this.findByUserId(userId);
    if (!existingProfile) return null;

    // Prepare update data
    const updates: Record<string, any> = {
      updated_at: now,
    };

    if (input.preferredLanguage !== undefined)
      updates.preferred_language = input.preferredLanguage;
    if (input.learningLanguages !== undefined)
      updates.learning_languages = JSON.stringify(input.learningLanguages);
    if (input.nativeLanguage !== undefined)
      updates.native_language = input.nativeLanguage;
    if (input.dailyGoal !== undefined) updates.daily_goal = input.dailyGoal;
    if (input.theme !== undefined) updates.theme = input.theme;
    if (input.settings !== undefined)
      updates.settings = JSON.stringify(input.settings);
    if (input.lastLogin !== undefined)
      updates.last_login = input.lastLogin.toISOString();

    // Build SET clause for SQL
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    // Build values array for SQL
    const values = Object.values(updates);
    values.push(userId); // Add userId for WHERE clause

    // Execute update
    db.prepare(
      `
      UPDATE user_profile
      SET ${setClause}
      WHERE user_id = ?
    `,
    ).run(...values);

    // Return updated user profile
    return this.findByUserId(userId);
  }

  /**
   * Delete a user profile
   */
  static delete(userId: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM user_profile WHERE user_id = ?")
      .run(userId);
    return result.changes > 0;
  }

  /**
   * Find users by preferred language
   */
  static findByPreferredLanguage(language: string): UserProfile[] {
    const db = getDatabase();
    const userProfiles = db
      .prepare(
        `
      SELECT * FROM user_profile 
      WHERE preferred_language = ?
      ORDER BY updated_at DESC
    `,
      )
      .all(language) as DbUserProfile[];

    return userProfiles.map(mapDbToUserProfile);
  }

  /**
   * Update last login time
   */
  static updateLastLogin(userId: string): UserProfile | null {
    return this.update(userId, { lastLogin: new Date() });
  }
}
