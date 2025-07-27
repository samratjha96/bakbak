/**
 * Utility class to generate consistent paths for storing recording files
 *
 * This helps maintain consistent path structure across the application and
 * avoids path structure duplication in different parts of the code.
 *
 * Storage structure: recordings/userid/todaysdate/recording_uuid
 */
export class RecordingStoragePaths {
  /**
   * Base path for all recordings
   */
  private static readonly BASE_PATH = "recordings";

  /**
   * Generates today's date in YYYY-MM-DD format for consistent path structure
   * @returns Date string in YYYY-MM-DD format
   */
  private static getTodaysDate(): string {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD format
  }

  /**
   * Generates a unique recording UUID using modern crypto API
   * Requires Node.js 16+ or modern browser environment
   * @returns A new UUID for the recording
   */
  private static generateRecordingUUID(): string {
    // Require modern crypto.randomUUID - no fallbacks
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    throw new Error(
      "crypto.randomUUID is not available. " +
        "This application requires Node.js 16+ or a modern browser environment.",
    );
  }

  /**
   * Gets the path for storing an audio recording with proper organization by user and date
   * @param userId User ID for the recording
   * @param fileExtension File extension (default: webm)
   * @param customDate Optional custom date (defaults to today's date)
   * @returns The storage path for the recording
   */
  static getAudioPath(
    userId: string,
    fileExtension: string = "webm",
    customDate?: string,
  ): string {
    const dateStr = customDate || this.getTodaysDate();
    const recordingUUID = this.generateRecordingUUID();
    return `${this.BASE_PATH}/${userId}/${dateStr}/${recordingUUID}.${fileExtension}`;
  }

  /**
   * Gets the path for storing metadata for an audio recording
   * @param audioPath Path to the audio file
   * @returns The storage path for the metadata
   */
  static getMetadataPath(audioPath: string): string {
    return `${audioPath}.metadata.json`;
  }

  /**
   * Gets the path for storing transcription data
   * @param userId User ID for the recording
   * @param recordingUUID The UUID of the associated recording
   * @param customDate Optional custom date (defaults to today's date)
   * @returns The storage path for the transcription
   */
  static getTranscriptionPath(
    userId: string,
    recordingUUID: string,
    customDate?: string,
  ): string {
    const dateStr = customDate || this.getTodaysDate();
    return `${this.BASE_PATH}/${userId}/${dateStr}/${recordingUUID}-transcription.json`;
  }

  /**
   * Gets the path for storing translation data
   * @param userId User ID for the recording
   * @param recordingUUID The UUID of the associated recording
   * @param targetLanguage The target language code
   * @param customDate Optional custom date (defaults to today's date)
   * @returns The storage path for the translation
   */
  static getTranslationPath(
    userId: string,
    recordingUUID: string,
    targetLanguage: string,
    customDate?: string,
  ): string {
    const dateStr = customDate || this.getTodaysDate();
    return `${this.BASE_PATH}/${userId}/${dateStr}/${recordingUUID}-translation-${targetLanguage}.json`;
  }

  /**
   * Gets the directory for a user's recordings in a specific language
   * @param language Language code
   * @param userId User ID
   * @returns The directory path
   */
  static getUserLanguageDirectory(language: string, userId: string): string {
    return `${this.BASE_PATH}/${language}/user-${userId}/`;
  }

  /**
   * Gets the base path for a user's recordings on a specific date
   * @param userId User ID
   * @param customDate Optional custom date (defaults to today's date)
   * @returns The base path for the user's recordings on the given date
   */
  static getUserDatePath(userId: string, customDate?: string): string {
    const dateStr = customDate || this.getTodaysDate();
    return `${this.BASE_PATH}/${userId}/${dateStr}`;
  }

  /**
   * Gets the base path for all of a user's recordings
   * @param userId User ID
   * @returns The base path for all user recordings
   */
  static getUserPath(userId: string): string {
    return `${this.BASE_PATH}/${userId}`;
  }

  /**
   * Gets the directory for all recordings in a language
   * @param language Language code
   * @returns The directory path
   */
  static getLanguageDirectory(language: string): string {
    return `${this.BASE_PATH}/${language}/`;
  }

  /**
   * Gets the path for a collection of recordings
   * @param collectionId Collection identifier
   * @returns The directory path for the collection
   */
  static getCollectionPath(collectionId: string): string {
    return `${this.BASE_PATH}/collections/${collectionId}/`;
  }

  /**
   * Extracts the recording UUID from a file path
   * @param filePath The storage path
   * @returns The recording UUID or null if not found
   */
  static extractRecordingUUID(filePath: string): string | null {
    const parts = filePath.split("/");
    if (parts.length < 4) return null;

    const filename = parts[parts.length - 1];
    const uuidMatch = filename.match(/^([a-f0-9-]{36})/);
    return uuidMatch ? uuidMatch[1] : null;
  }

  /**
   * Extracts user ID from a file path
   * @param filePath The storage path
   * @returns The user ID or null if not found
   */
  static extractUserId(filePath: string): string | null {
    const parts = filePath.split("/");
    if (parts.length < 4) return null;

    return parts[1]; // recordings/userid/date/file
  }

  /**
   * Extracts the date from a file path
   * @param filePath The storage path
   * @returns The date string or null if not found
   */
  static extractDate(filePath: string): string | null {
    const parts = filePath.split("/");
    if (parts.length < 4) return null;

    return parts[2]; // recordings/userid/date/file
  }
}
