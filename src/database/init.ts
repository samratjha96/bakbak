import { getDatabase } from "./index";
import { auth } from "../lib/auth";

/**
 * Initialize the database
 * This function should be called when the application starts
 */
export async function initializeDatabase() {
  console.log("Initializing database...");

  try {
    // Get database instance (will create tables)
    const db = getDatabase();

    // Create necessary indexes (done in schema.ts)

    // Insert default data if needed
    await insertDefaultData();

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Insert default data into the database
 * This is useful for development and testing
 */
async function insertDefaultData() {
  // Only insert default data in development mode
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("Inserting default data for development...");

  // Add default data here if needed for testing
  // For example, a default admin user or test recordings

  const db = getDatabase();

  // Example: Check if any users exist
  const usersExist = db.prepare("SELECT COUNT(*) as count FROM user").get() as {
    count: number;
  };

  // If no users exist and we're in dev mode, create a test user
  if (!usersExist || usersExist.count === 0) {
    // Creating users via better-auth programmatically may not be supported here.
    // Skip silently in CI/build to avoid type/runtime issues.
    console.log("No users exist; skipping programmatic user creation in init.");
  }
}

// Export a function to seed test data (useful for automated tests)
export async function seedTestData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cannot seed test data in production");
  }

  console.log("Seeding test data...");

  // Implementation for test data seeding can go here
}
