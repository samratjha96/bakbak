import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Database connection singleton
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    try {
      // Get the database path - in development it's in data/sqlite.db
      const dbPath =
        process.env.DATABASE_URL ||
        path.join(process.cwd(), "data", "sqlite.db");

      // Ensure the data directory exists
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      db = new Database(dbPath);

      // Enable foreign keys
      db.pragma("foreign_keys = ON");

      // Enable WAL mode for better concurrent access
      db.pragma("journal_mode = WAL");
    } catch (error) {
      console.error("Error connecting to database:", error);
      throw error;
    }
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Helper function to get current user ID from the auth system
export function getCurrentUserId(): string | null {
  // In a server context, this would use getSession() from better-auth
  // In browser context, this would use useSession() from better-auth/react

  // Since this is a shared utility that could be used in either context,
  // the actual implementation depends on where it's called from

  try {
    // For development/testing only - fallback to test user if no auth session
    if (process.env.NODE_ENV !== "production") {
      const db = getDatabase();
      const testUser = db.prepare("SELECT id FROM user LIMIT 1").get() as
        | { id: string }
        | undefined;

      if (testUser) {
        return testUser.id;
      }
    }

    // No user found and not in production
    return null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}
