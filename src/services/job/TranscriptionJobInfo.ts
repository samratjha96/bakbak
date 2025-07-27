/**
 * Represents the status of a transcription job
 */
export type JobStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/**
 * Information about a transcription job
 */
export interface TranscriptionJobInfo {
  /**
   * Unique identifier for the job
   */
  jobId: string;

  /**
   * ID of the recording being transcribed
   */
  recordingId: string;

  /**
   * Current status of the job
   */
  status: JobStatus;

  /**
   * ISO language code for the transcription
   */
  languageCode?: string;

  /**
   * When the job was created
   */
  createdAt: Date;

  /**
   * When the job was last updated
   */
  updatedAt: Date;

  /**
   * When the job was completed (if applicable)
   */
  completedAt?: Date;

  /**
   * Error message if the job failed
   */
  errorMessage?: string;

  /**
   * Additional metadata for the job
   */
  metadata?: Record<string, unknown>;
}
