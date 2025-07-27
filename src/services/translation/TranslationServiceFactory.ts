import { TranslationService } from "./TranslationService";
import { AWSTranslateService } from "./AWSTranslateService";
import { MockTranslateService } from "./MockTranslateService";

/**
 * Factory for creating TranslationService instances
 */
export class TranslationServiceFactory {
  private static instance: TranslationService | null = null;

  /**
   * Gets a TranslationService instance, creating one if it doesn't exist
   * @param useMock Whether to use a mock implementation (defaults to false)
   * @returns A TranslationService instance
   */
  public static getInstance(useMock: boolean = false): TranslationService {
    if (!TranslationServiceFactory.instance) {
      // Use mock or real implementation based on parameter
      if (useMock || process.env.NODE_ENV === "test") {
        TranslationServiceFactory.instance = new MockTranslateService();
      } else {
        TranslationServiceFactory.instance = new AWSTranslateService();
      }
    }

    return TranslationServiceFactory.instance;
  }

  /**
   * Sets the TranslationService instance
   * Useful for injecting mock services in tests
   * @param service The TranslationService instance to use
   */
  public static setInstance(service: TranslationService): void {
    TranslationServiceFactory.instance = service;
  }

  /**
   * Resets the TranslationService instance
   * Useful for cleaning up after tests
   */
  public static resetInstance(): void {
    TranslationServiceFactory.instance = null;
  }
}
