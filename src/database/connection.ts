import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { auth } from "~/lib/auth";
import { getWebRequest } from "@tanstack/react-start/server";

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
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const request = getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const request = getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    return !!session;
  } catch {
    return false;
  }
}
