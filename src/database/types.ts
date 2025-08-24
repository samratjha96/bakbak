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
