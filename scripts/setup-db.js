#!/usr/bin/env node

/**
 * Database initialization script
 *
 * This script creates the database schema and can optionally seed data
 * for development or testing environments.
 *
 * Run with:
 * node scripts/setup-db.js
 *
 * Or with seed data:
 * node scripts/setup-db.js --seed
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { execSync } from "child_process";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSeed = args.includes("--seed");
const environment = process.env.NODE_ENV || "development";

// Project root directory (one level up from scripts)
const rootDir = path.resolve(__dirname, "..");

// Ensure data directory exists
const dataDir = path.join(rootDir, "data");
if (!fs.existsSync(dataDir)) {
  console.log("Creating data directory...");
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(rootDir, "data", "sqlite.db");
console.log(`Initializing database at ${dbPath}`);

// Generate better-auth tables first
console.log("Generating better-auth database schema...");
try {
  execSync("npx @better-auth/cli generate", {
    cwd: rootDir,
    stdio: "inherit",
  });
  console.log("Better-auth schema generated successfully");
} catch (error) {
  console.error("Error generating better-auth schema:", error.message);
  console.log("Continuing with manual database setup...");
}

/**
 * Generate a UUID for consistent IDs
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Initialize the database schema
 */
const initializeSchema = (db) => {
  // Create user_profile table (extends better-auth user table)
  db.exec(`
    -- Check if the table already exists
    CREATE TABLE IF NOT EXISTS user_profile (
      user_id TEXT PRIMARY KEY,
      preferred_language TEXT,
      learning_languages TEXT, -- JSON array of language codes the user is learning
      native_language TEXT,     -- User's native language
      daily_goal INTEGER,       -- Daily practice goal in minutes
      theme TEXT DEFAULT 'light',
      settings JSON,            -- Any additional user settings as JSON
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      -- Reference the user table from better-auth
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    -- Index for finding users by language preferences
    CREATE INDEX IF NOT EXISTS idx_user_profile_preferred_language ON user_profile(preferred_language);
  `);

  // Create Recordings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      language TEXT,
      duration INTEGER NOT NULL, -- in seconds
      notes TEXT, -- User notes for this recording
      metadata JSON, -- For any additional recording metadata
      status TEXT CHECK(status IN ('processing', 'ready', 'error')) DEFAULT 'processing',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );

    -- Index for faster queries by user_id
    CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
    
    -- Index for queries by language
    CREATE INDEX IF NOT EXISTS idx_recordings_language ON recordings(language);
  `);

  // Create Transcriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id TEXT PRIMARY KEY,
      recording_id TEXT NOT NULL,
      text TEXT,
      romanization TEXT,
      language TEXT NOT NULL,
      job_id TEXT,
      status TEXT CHECK(status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')) DEFAULT 'NOT_STARTED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
    );
    
    -- Index for faster queries by recording_id
    CREATE INDEX IF NOT EXISTS idx_transcriptions_recording_id ON transcriptions(recording_id);
  `);

  // Create Translations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      transcription_id TEXT NOT NULL,
      text TEXT NOT NULL,
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      status TEXT CHECK(status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')) DEFAULT 'NOT_STARTED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE
    );
    
    -- Index for faster queries by transcription_id
    CREATE INDEX IF NOT EXISTS idx_translations_transcription_id ON translations(transcription_id);
    
    -- Composite index for looking up translations by language pair
    CREATE INDEX IF NOT EXISTS idx_translations_languages ON translations(source_language, target_language);
  `);

  // Notes are now part of the recordings table - no separate notes table needed

  // Create Workspaces table for collaboration
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      slug TEXT UNIQUE NOT NULL,
      avatar_url TEXT,
      settings JSON DEFAULT '{}',
      storage_quota INTEGER DEFAULT 1073741824, -- 1GB in bytes
      storage_used INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE RESTRICT
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
    CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
  `);

  // Create Workspace Memberships table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_memberships (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending')),
      invited_by TEXT,
      invited_at TIMESTAMP,
      joined_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES user(id) ON DELETE SET NULL,
      UNIQUE(workspace_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_id ON workspace_memberships(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_id ON workspace_memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_memberships_status ON workspace_memberships(status);
  `);

  // Create RecordingSharing table for collaboration (keeping for backward compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS recording_sharing (
      id TEXT PRIMARY KEY,
      recording_id TEXT NOT NULL,
      user_id TEXT NOT NULL, -- Owner of the recording
      shared_with_user_id TEXT NOT NULL, -- User with whom the recording is shared
      permission_level TEXT CHECK(permission_level IN ('view', 'edit', 'admin')) DEFAULT 'view',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES user(id) ON DELETE CASCADE,
      -- Ensure no duplicate shares for the same recording-user combination
      UNIQUE(recording_id, shared_with_user_id)
    );
    
    -- Index for faster queries by recording_id
    CREATE INDEX IF NOT EXISTS idx_sharing_recording_id ON recording_sharing(recording_id);
    
    -- Index for faster queries by user_id (recordings shared by a user)
    CREATE INDEX IF NOT EXISTS idx_sharing_user_id ON recording_sharing(user_id);
    
    -- Index for faster queries by shared_with_user_id (recordings shared with a user)
    CREATE INDEX IF NOT EXISTS idx_sharing_with_user_id ON recording_sharing(shared_with_user_id);
  `);

  // Add workspace_id column to recordings table (only if it doesn't exist)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(recordings)").all();
    const hasWorkspaceId = tableInfo.some(
      (column) => column.name === "workspace_id",
    );

    if (!hasWorkspaceId) {
      db.exec(`ALTER TABLE recordings ADD COLUMN workspace_id TEXT;`);
    }
  } catch (error) {
    console.log(
      "Note: workspace_id column may already exist in recordings table",
    );
  }

  // Create index for workspace queries on recordings
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_recordings_workspace_id ON recordings(workspace_id);
  `);
};

/**
 * Migrate existing recordings to workspaces
 * This function ensures all existing recordings are associated with a workspace
 */
const migrateExistingRecordings = (db) => {
  console.log("Migrating existing recordings to workspaces...");

  try {
    // First, ensure all users have a personal workspace
    const usersWithRecordings = db
      .prepare(
        `
      SELECT DISTINCT user_id 
      FROM recordings 
      WHERE workspace_id IS NULL
    `,
      )
      .all();

    if (usersWithRecordings.length === 0) {
      console.log("No recordings need migration");
      return;
    }

    console.log(
      `Found ${usersWithRecordings.length} users with recordings needing migration`,
    );

    for (const { user_id } of usersWithRecordings) {
      const personalWorkspaceId = `personal-${user_id}`;

      // Check if personal workspace exists for this user
      const existingWorkspace = db
        .prepare(
          `
        SELECT id FROM workspaces WHERE id = ?
      `,
        )
        .get(personalWorkspaceId);

      if (!existingWorkspace) {
        console.log(`Creating personal workspace for user ${user_id}`);

        const now = new Date().toISOString();

        // Create personal workspace
        try {
          db.prepare(
            `
            INSERT INTO workspaces (
              id, name, description, slug, settings, storage_quota, 
              storage_used, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          ).run(
            personalWorkspaceId,
            "Personal Workspace",
            "Your personal workspace for private recordings",
            personalWorkspaceId,
            JSON.stringify({}),
            1073741824, // 1GB
            0,
            user_id,
            now,
            now,
          );

          // Create workspace membership
          db.prepare(
            `
            INSERT INTO workspace_memberships (
              id, workspace_id, user_id, role, status, joined_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          ).run(
            `wsm-${personalWorkspaceId}-${user_id}`,
            personalWorkspaceId,
            user_id,
            "owner",
            "active",
            now,
            now,
            now,
          );

          console.log(`Created personal workspace for user ${user_id}`);
        } catch (error) {
          console.warn(
            `Error creating workspace for user ${user_id}:`,
            error.message,
          );
          continue;
        }
      }

      // Migrate recordings to the personal workspace
      const result = db
        .prepare(
          `
        UPDATE recordings 
        SET workspace_id = ?, updated_at = ?
        WHERE user_id = ? AND workspace_id IS NULL
      `,
        )
        .run(personalWorkspaceId, new Date().toISOString(), user_id);

      if (result.changes > 0) {
        console.log(
          `Migrated ${result.changes} recordings for user ${user_id} to personal workspace`,
        );
      }
    }

    console.log("Recording migration completed successfully");
  } catch (error) {
    console.error("Error migrating existing recordings:", error);
  }
};

/**
 * Create test workspaces for a user
 */
const createTestWorkspaces = (db, userId) => {
  console.log("Creating test workspaces...");

  const now = new Date().toISOString();

  // Create a personal workspace for the user
  const personalWorkspace = {
    id: `personal-${userId}`,
    name: "Personal Workspace",
    description: "Your personal workspace for private recordings",
    slug: `personal-${userId}`,
    avatar_url: null,
    settings: JSON.stringify({}),
    storage_quota: 1073741824, // 1GB
    storage_used: 0,
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  // Create a team workspace for collaboration
  const teamWorkspace = {
    id: `team-${userId}`,
    name: "Team Workspace",
    description: "Shared workspace for team collaboration",
    slug: `team-${userId}`,
    avatar_url: null,
    settings: JSON.stringify({}),
    storage_quota: 5368709120, // 5GB
    storage_used: 0,
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  const workspaces = [personalWorkspace, teamWorkspace];

  // Insert workspaces
  const insertWorkspaceStmt = db.prepare(`
    INSERT OR IGNORE INTO workspaces (
      id, name, description, slug, avatar_url, settings,
      storage_quota, storage_used, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const workspace of workspaces) {
    try {
      const result = insertWorkspaceStmt.run(
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

      if (result.changes > 0) {
        console.log(`Created workspace: ${workspace.name}`);
      } else {
        console.log(`Workspace already exists: ${workspace.name}`);
      }
    } catch (error) {
      console.warn(`Error creating workspace ${workspace.id}:`, error);
    }
  }

  // Create workspace memberships (owner role for the user)
  const insertMembershipStmt = db.prepare(`
    INSERT OR IGNORE INTO workspace_memberships (
      id, workspace_id, user_id, role, status, invited_by,
      invited_at, joined_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const workspace of workspaces) {
    const membershipId = `wsm-${workspace.id}-${userId}`;
    try {
      const result = insertMembershipStmt.run(
        membershipId,
        workspace.id,
        userId,
        "owner",
        "active",
        null, // not invited by anyone, they created it
        null,
        now, // joined when created
        now,
        now,
      );

      if (result.changes > 0) {
        console.log(`Created membership for ${workspace.name}`);
      } else {
        console.log(`Membership already exists for ${workspace.name}`);
      }
    } catch (error) {
      console.warn(`Error creating membership for ${workspace.id}:`, error);
    }
  }

  return workspaces;
};

/**
 * Create test recordings for a user
 */
const createTestRecordings = (db, userId, workspaces = []) => {
  console.log("Creating test recordings...");

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

  // Find personal workspace to assign recordings to
  const personalWorkspace = workspaces.find(
    (ws) => ws.id === `personal-${userId}`,
  );
  const workspaceId = personalWorkspace ? personalWorkspace.id : null;

  // Create a few test recordings
  const recordings = [
    {
      id: "rec-1",
      user_id: userId,
      title: "Japanese Conversation Practice",
      description: "Basic greetings and introductions",
      file_path: `recordings/XqmkB9YbkUfYoHhUy4FBkMShidp6KHdx/2025-07-28/f5b5c81c-8cc2-48b5-abcc-3c8edc9b5b84.mp3`,
      language: "Japanese",
      duration: 84, // 1:24
      notes: `- "こんにちは" (Konnichiwa) = Hello/Good afternoon
- "私の名前は" (Watashi no namae wa) = My name is
- "勉強しています" (Benkyou shiteimasu) = I am studying
- "よろしくお願いします" (Yoroshiku onegaishimasu) = Please treat me well / Nice to meet you

Remember to practice the proper intonation for "よろしくお願いします" - rising on "shi" and falling on "masu".`,
      workspace_id: workspaceId,
      status: "ready",
      created_at: now,
      updated_at: now,
    },
    {
      id: "rec-2",
      user_id: userId,
      title: "French Restaurant Phrases",
      description: "Common phrases for ordering food",
      file_path: `recordings/XqmkB9YbkUfYoHhUy4FBkMShidp6KHdx/2025-07-28/f5b5c81c-8cc2-48b5-abcc-3c8edc9b5b84.mp3`,
      language: "French",
      duration: 158, // 2:38
      workspace_id: workspaceId,
      status: "ready",
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "rec-3",
      user_id: userId,
      title: "Korean Shopping Vocabulary",
      description: "Words for shopping and bargaining",
      file_path: `recordings/XqmkB9YbkUfYoHhUy4FBkMShidp6KHdx/2025-07-28/f5b5c81c-8cc2-48b5-abcc-3c8edc9b5b84.mp3`,
      language: "Korean",
      duration: 222, // 3:42
      workspace_id: workspaceId,
      status: "ready",
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
    },
  ];

  // Insert test recordings
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO recordings (
      id, user_id, title, description, file_path, language,
      duration, notes, workspace_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const rec of recordings) {
    try {
      const result = insertStmt.run(
        rec.id,
        rec.user_id,
        rec.title,
        rec.description,
        rec.file_path,
        rec.language,
        rec.duration,
        rec.notes,
        rec.workspace_id,
        rec.status,
        rec.created_at,
        rec.updated_at,
      );

      if (result.changes > 0) {
        console.log(`Created recording: ${rec.title}`);
      } else {
        console.log(`Recording already exists: ${rec.title}`);
      }
    } catch (error) {
      console.warn(`Error creating test recording ${rec.id}:`, error);
    }
  }

  // Add a transcription for the Japanese recording
  try {
    const transcriptionId = "trans-1";
    const transcriptionText =
      "こんにちは、私の名前はアレックスです。日本語を勉強しています。よろしくお願いします。";

    db.prepare(
      `
      INSERT OR IGNORE INTO transcriptions (
        id, recording_id, text, romanization, language,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      transcriptionId,
      "rec-1",
      transcriptionText,
      "Konnichiwa, watashi no namae wa Arekkusu desu. Nihongo wo benkyou shiteimasu. Yoroshiku onegaishimasu.",
      "ja",
      "COMPLETED",
      now,
      now,
    );

    // Add a translation for the transcription
    db.prepare(
      `
      INSERT OR IGNORE INTO translations (
        id, transcription_id, text, source_language, target_language,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "transl-1",
      transcriptionId,
      "Hello, my name is Alex. I am studying Japanese. Nice to meet you.",
      "ja",
      "en",
      "COMPLETED",
      now,
      now,
    );

    // Notes are now stored directly in the recordings table

    console.log("Created test transcriptions, translations, and notes");
  } catch (error) {
    console.warn("Error creating test transcriptions and related data:", error);
  }
};

/**
 * Seed the database with test data
 *
 * NOTE: We assume the 'user' table already exists and is managed by better-auth
 * The script will look for an existing user to associate test data with
 */
const seedData = (db) => {
  try {
    // Check if better-auth's user table exists
    let userTableExists = false;
    try {
      const tableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='user'",
        )
        .get();
      userTableExists = !!tableCheck;
    } catch (error) {
      console.error("Error checking for user table:", error);
    }

    if (!userTableExists) {
      console.error(
        "The 'user' table doesn't exist. Please run the application first to initialize better-auth.",
      );
      console.error(
        "Seeding will continue, but some features may not work without valid users.",
      );

      // Instead of creating a full user table, create a simple placeholder for testing
      db.exec(`
        CREATE TABLE IF NOT EXISTS user (
          id TEXT PRIMARY KEY, 
          email TEXT NOT NULL UNIQUE
        );
        
        -- Insert a test user just for development purposes
        INSERT OR IGNORE INTO user (id, email) 
        VALUES ('test-user-id', 'test@example.com');
      `);
    }

    // Find a test user ID to associate with our test data
    let userId = null;
    try {
      const userRow = db
        .prepare("SELECT id FROM user WHERE email = 'test@example.com' LIMIT 1")
        .get();
      if (userRow) {
        userId = userRow.id;
        console.log(`Using existing user with id: ${userId}`);
      } else {
        // Try to find any user
        const anyUser = db.prepare("SELECT id FROM user LIMIT 1").get();
        if (anyUser) {
          userId = anyUser.id;
          console.log(`Using existing user with id: ${userId}`);
        } else {
          console.warn(
            "No users found in the database. Some test data may not be created.",
          );
        }
      }
    } catch (error) {
      console.error("Error finding test user:", error);
    }

    if (userId) {
      // Create user profile for the test user
      db.prepare(
        `
        INSERT OR IGNORE INTO user_profile (
          user_id, preferred_language, created_at, updated_at
        ) VALUES (?, ?, ?, ?)
      `,
      ).run(
        userId,
        "English",
        new Date().toISOString(),
        new Date().toISOString(),
      );

      // Create test workspaces for the user
      const workspaces = createTestWorkspaces(db, userId);

      // Create test data associated with this user
      createTestRecordings(db, userId, workspaces);
    } else {
      console.error("No valid user ID found. Cannot create test recordings.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// Create database connection
let db;
try {
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Initialize schema
  console.log("Creating database schema...");
  initializeSchema(db);

  // Migrate existing recordings to workspaces (always run this)
  migrateExistingRecordings(db);

  // Seed data if requested
  if (shouldSeed && environment !== "production") {
    console.log("Seeding database with test data...");
    seedData(db);
  }

  console.log("Database setup completed successfully!");
} catch (error) {
  console.error("Error setting up database:", error);
  process.exit(1);
} finally {
  // Close the database connection
  if (db) {
    db.close();
  }
}
