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

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSeed = args.includes("--seed");
const environment = process.env.NODE_ENV || "development";

// Project root directory (one level up from scripts)
const rootDir = path.resolve(__dirname, '..');

// Ensure data directory exists
const dataDir = path.join(rootDir, "data");
if (!fs.existsSync(dataDir)) {
  console.log("Creating data directory...");
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(rootDir, "data", "sqlite.db");
console.log(`Initializing database at ${dbPath}`);

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
};

// No longer creating test users directly - we rely on better-auth to create users

/**
 * Create test recordings for a user
 */
const createTestRecordings = (db, userId) => {
  console.log("Creating test recordings...");
  
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  
  // Create a few test recordings
  const recordings = [
    {
      id: "rec-1",
      user_id: userId,
      title: "Japanese Conversation Practice",
      description: "Basic greetings and introductions",
      file_path: `recordings/${userId}/2025-07-25/sample-japanese.webm`,
      language: "Japanese",
      duration: 84, // 1:24
      status: "ready",
      created_at: now,
      updated_at: now
    },
    {
      id: "rec-2",
      user_id: userId,
      title: "French Restaurant Phrases",
      description: "Common phrases for ordering food",
      file_path: `recordings/${userId}/2025-07-24/sample-french.webm`,
      language: "French",
      duration: 158, // 2:38
      status: "ready",
      created_at: yesterday,
      updated_at: yesterday
    },
    {
      id: "rec-3",
      user_id: userId,
      title: "Korean Shopping Vocabulary",
      description: "Words for shopping and bargaining",
      file_path: `recordings/${userId}/2025-07-23/sample-korean.webm`,
      language: "Korean",
      duration: 222, // 3:42
      status: "ready",
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo
    }
  ];
  
  // Insert test recordings
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO recordings (
      id, user_id, title, description, file_path, language,
      duration, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        rec.status,
        rec.created_at,
        rec.updated_at
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
    const transcriptionText = "こんにちは、私の名前はアレックスです。日本語を勉強しています。よろしくお願いします。";
    
    db.prepare(`
      INSERT OR IGNORE INTO transcriptions (
        id, recording_id, text, romanization, language,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transcriptionId,
      "rec-1",
      transcriptionText,
      "Konnichiwa, watashi no namae wa Arekkusu desu. Nihongo wo benkyou shiteimasu. Yoroshiku onegaishimasu.",
      "ja",
      "COMPLETED",
      now,
      now
    );
    
    // Add a translation for the transcription
    db.prepare(`
      INSERT OR IGNORE INTO translations (
        id, transcription_id, text, source_language, target_language,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "transl-1",
      transcriptionId,
      "Hello, my name is Alex. I am studying Japanese. Nice to meet you.",
      "ja",
      "en",
      "COMPLETED",
      now,
      now
    );
    
    // Add a note for the Japanese recording
    const noteId = "note-1";
    db.prepare(`
      INSERT OR IGNORE INTO notes (
        id, recording_id, user_id, content, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      "rec-1",
      userId,
      `- "こんにちは" (Konnichiwa) = Hello/Good afternoon
- "私の名前は" (Watashi no namae wa) = My name is
- "勉強しています" (Benkyou shiteimasu) = I am studying
- "よろしくお願いします" (Yoroshiku onegaishimasu) = Please treat me well / Nice to meet you

Remember to practice the proper intonation for "よろしくお願いします" - rising on "shi" and falling on "masu".`,
      now,
      now
    );
    
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
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user'").get();
      userTableExists = !!tableCheck;
    } catch (error) {
      console.error("Error checking for user table:", error);
    }
    
    if (!userTableExists) {
      console.error("The 'user' table doesn't exist. Please run the application first to initialize better-auth.");
      console.error("Seeding will continue, but some features may not work without valid users.");
      
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
      const userRow = db.prepare("SELECT id FROM user WHERE email = 'test@example.com' LIMIT 1").get();
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
          console.warn("No users found in the database. Some test data may not be created.");
        }
      }
    } catch (error) {
      console.error("Error finding test user:", error);
    }
    
    if (userId) {
      // Create user profile for the test user
      db.prepare(`
        INSERT OR IGNORE INTO user_profile (
          user_id, preferred_language, created_at, updated_at
        ) VALUES (?, ?, ?, ?)
      `).run(
        userId,
        "English",
        new Date().toISOString(),
        new Date().toISOString()
      );
      
      // Create test data associated with this user
      createTestRecordings(db, userId);
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