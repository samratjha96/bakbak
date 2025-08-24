// Database exports - essential only to avoid type conflicts
export { getDatabase, closeDatabase, getCurrentUserId } from "./connection";
export type {
  DbRecording,
  DbTranscription,
  DbTranslation,
  DbUser,
} from "./types";

// Export models
export * from "./models";

// Export auth utilities
export * from "./auth";

// Export schema and init for setup
export * from "./schema";
