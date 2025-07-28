import Database from "better-sqlite3";

/**
 * Database schema for the audio recording application
 * This module defines all tables and relationships
 */

/**
 * Initialize the database schema
 * @param db The SQLite database connection
 */
export function initializeSchema(db: Database.Database): void {
  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create Users table
  // Note: We're using the User table from better-auth, but extending it with our needs
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
      text TEXT NOT NULL,
      romanization TEXT,
      language TEXT NOT NULL,
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

  // Create Notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      recording_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER, -- optional position in recording (in seconds)
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
    
    -- Index for faster queries by recording_id
    CREATE INDEX IF NOT EXISTS idx_notes_recording_id ON notes(recording_id);
    
    -- Index for faster queries by user_id
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
  `);

  // Create RecordingSharing table for collaboration
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
}
