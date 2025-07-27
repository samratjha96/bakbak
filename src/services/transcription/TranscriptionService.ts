/**
 * TranscriptionService interface
 *
 * Abstract interface for audio transcription operations. The primary implementation
 * uses AWS Transcribe, but other implementations could be added for other services.
 */
export interface TranscriptionService {
  /**
   * Starts a new transcription job
   * @param recordingId The ID of the recording being transcribed (for reference)
   * @param audioUrl The URL of the audio file to transcribe
   * @param languageCode Optional ISO language code (e.g., 'en-US', 'es-ES')
   * @returns A promise that resolves to the transcription job ID
   */
  startTranscription(
    recordingId: string,
    audioUrl: string,
    languageCode?: string,
  ): Promise<string>;

  /**
   * Gets the status of a transcription job
   * @param jobId The ID of the transcription job
   * @returns A promise that resolves to an object containing the job status and optional error message
   */
  getTranscriptionStatus(jobId: string): Promise<{
    status: string;
    errorMessage?: string;
  }>;

  /**
   * Gets the result of a completed transcription job
   * @param jobId The ID of the completed transcription job
   * @returns A promise that resolves to the transcription result
   */
  getTranscriptionResult(jobId: string): Promise<TranscriptionResult>;

  /**
   * Cancels an in-progress transcription job
   * @param jobId The ID of the transcription job to cancel
   * @returns A promise that resolves when the job is cancelled
   */
  cancelTranscription(jobId: string): Promise<void>;
}

/**
 * Represents a segment of transcribed text with timing information
 */
export interface TranscriptionItem {
  /** The transcribed text for this segment */
  content: string;

  /** The start time of this segment in seconds */
  startTime: number;

  /** The end time of this segment in seconds */
  endTime: number;

  /** Confidence score from 0 to 1 */
  confidence: number;

  /** Speaker label (if speaker diarization is enabled) */
  speaker?: string;

  /** Type of the item (e.g., pronunciation, punctuation) */
  type: "pronunciation" | "punctuation";
}

/**
 * Represents the full result of a transcription job
 */
export interface TranscriptionResult {
  /** The full transcribed text */
  transcript: string;

  /** Detailed segments with timing information */
  items: TranscriptionItem[];

  /** The language of the transcription */
  languageCode: string;

  /** Alternative transcriptions (if available) */
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}
