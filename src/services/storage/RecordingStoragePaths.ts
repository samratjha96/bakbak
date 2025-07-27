/**
 * Utility class to generate consistent paths for storing recording files
 *
 * This helps maintain consistent path structure across the application and
 * avoids path structure duplication in different parts of the code.
 */
export class RecordingStoragePaths {
  /**
   * Base path for all recordings
   */
  private static readonly BASE_PATH = "recordings";

  /**
   * Gets the path for storing an audio recording
   * @param language Language code for the recording
   * @param userId Optional user ID
   * @param fileExtension File extension (default: webm)
   * @returns The storage path for the recording
   */
  static getAudioPath(
    language: string,
    userId?: string,
    fileExtension: string = "webm",
  ): string {
    const timestamp = Date.now();
    const userSegment = userId ? `user-${userId}` : "anonymous";
    return `${this.BASE_PATH}/${language}/${userSegment}/${timestamp}.${fileExtension}`;
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
   * Gets the path for storing transcriptions
   * @param audioPath Path to the audio file
   * @returns The storage path for the transcription
   */
  static getTranscriptionPath(audioPath: string): string {
    return `${audioPath}.transcription.json`;
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
}
