import { TranscriptionService } from "./TranscriptionService";
import { AWSTranscribeService } from "./AWSTranscribeService";

/**
 * Factory for creating TranscriptionService instances
 */
export class TranscriptionServiceFactory {
  private static instance: TranscriptionService | null = null;

  /**
   * Gets a TranscriptionService instance, creating one if it doesn't exist
   * @returns A TranscriptionService instance
   */
  public static getInstance(): TranscriptionService {
    if (!TranscriptionServiceFactory.instance) {
      // Default to AWS Transcribe implementation
      TranscriptionServiceFactory.instance = new AWSTranscribeService();
    }

    return TranscriptionServiceFactory.instance;
  }

  /**
   * Sets the TranscriptionService instance
   * Useful for injecting mock services in tests
   * @param service The TranscriptionService instance to use
   */
  public static setInstance(service: TranscriptionService): void {
    TranscriptionServiceFactory.instance = service;
  }

  /**
   * Resets the TranscriptionService instance
   * Useful for cleaning up after tests
   */
  public static resetInstance(): void {
    TranscriptionServiceFactory.instance = null;
  }
}
