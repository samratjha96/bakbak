// Database record types matching the schema from setup-db.js

export interface DbRecording {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_path: string;
  language?: string;
  duration: number; // in seconds
  notes?: string; // User notes for this recording
  metadata?: string; // JSON string
  status: "processing" | "ready" | "error";
  workspace_id?: string; // Added for workspace support
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface DbTranscription {
  id: string;
  recording_id: string;
  text: string;
  romanization?: string;
  language: string;
  job_id?: string; // External service job identifier (e.g., AWS Transcribe job ID)
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface DbTranslation {
  id: string;
  transcription_id: string;
  text: string;
  source_language: string;
  target_language: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Notes are now part of the recordings table - no separate DbNote interface needed

export interface DbUser {
  id: string;
  name: string;
  email: string;
  emailVerified: number; // SQLite boolean (0/1)
  image?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface DbWorkspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  avatar_url?: string;
  settings: string; // JSON string
  storage_quota: number;
  storage_used: number;
  created_by: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface DbWorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  status: "active" | "pending";
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
