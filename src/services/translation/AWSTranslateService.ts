import {
  TranslateClient,
  TranslateTextCommand,
  TranslateTextCommandInput,
  TranslateTextCommandOutput,
  TranslateTextResponse,
  LanguageCodeString,
  BatchTranslateTextCommand,
  BatchTranslateTextCommandInput,
} from "@aws-sdk/client-translate";
import {
  TranslationService,
  TranslationSegment,
  TranscriptionData,
  TranslationResult,
} from "./TranslationService";
import { translateClient } from "~/lib/translate-client";

/**
 * Implementation of TranslationService using AWS Translate
 */
export class AWSTranslateService implements TranslationService {
  private client: TranslateClient;
  private region: string;
  private cache: Map<string, { translatedText: string; timestamp: Date }>;
  // Default cache expiration of 24 hours (in milliseconds)
  private cacheExpiration: number = 24 * 60 * 60 * 1000;

  /**
   * Creates a new AWSTranslateService
   * @param client Optional TranslateClient (uses default credentials if not provided)
   */
  constructor(client: TranslateClient = translateClient) {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.client = client;
    this.cache = new Map();
  }

  /**
   * Set cache expiration time
   * @param timeInMilliseconds Time in milliseconds for cache entries to expire
   */
  setCacheExpiration(timeInMilliseconds: number): void {
    this.cacheExpiration = timeInMilliseconds;
  }

  /**
   * Clear the translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generate a cache key for a translation request
   * @param text Text to translate
   * @param sourceLanguage Source language code
   * @param targetLanguage Target language code
   * @returns A unique cache key
   */
  private generateCacheKey(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): string {
    // Create a simplified hash of the text to avoid excessively long keys
    const textHash = Buffer.from(text).toString("base64").substring(0, 20);
    return `${sourceLanguage}:${targetLanguage}:${textHash}`;
  }

  /**
   * Check if a cached translation is still valid
   * @param timestamp When the translation was cached
   * @returns True if the cached translation is still valid, false otherwise
   */
  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    return now.getTime() - timestamp.getTime() < this.cacheExpiration;
  }

  /**
   * Translates a text string from one language to another
   * @param text The text to translate
   * @param sourceLanguage The source language code (e.g., 'en', 'ja', 'es')
   * @param targetLanguage The target language code (e.g., 'en', 'ja', 'es')
   * @returns A promise that resolves to the translated text
   */
  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    // Skip translation if languages are the same
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(
      text,
      sourceLanguage,
      targetLanguage,
    );
    const cachedResult = this.cache.get(cacheKey);

    if (cachedResult && this.isCacheValid(cachedResult.timestamp)) {
      return cachedResult.translatedText;
    }

    try {
      // Map language codes to AWS format if needed
      const awsSourceLanguage = this.normalizeLanguageCode(sourceLanguage);
      const awsTargetLanguage = this.normalizeLanguageCode(targetLanguage);

      // Configure the translation request
      const input: TranslateTextCommandInput = {
        Text: text,
        SourceLanguageCode: awsSourceLanguage,
        TargetLanguageCode: awsTargetLanguage,
      };

      // Execute the translation request
      const command = new TranslateTextCommand(input);
      const response = await this.client.send(command);

      if (!response.TranslatedText) {
        throw new Error("Translation failed: No translated text received");
      }

      // Cache the result
      this.cache.set(cacheKey, {
        translatedText: response.TranslatedText,
        timestamp: new Date(),
      });

      return response.TranslatedText;
    } catch (error) {
      console.error("Error translating text with AWS Translate:", error);
      throw new Error(`Failed to translate text: ${(error as Error).message}`);
    }
  }

  /**
   * Translates an array of text segments from one language to another
   * @param segments The segments to translate (array of objects with text property)
   * @param sourceLanguage The source language code (e.g., 'en', 'ja', 'es')
   * @param targetLanguage The target language code (e.g., 'en', 'ja', 'es')
   * @returns A promise that resolves to an array of translated segments
   */
  async translateSegments(
    segments: TranslationSegment[],
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationSegment[]> {
    // Skip translation if languages are the same
    if (sourceLanguage === targetLanguage) {
      return segments.map((segment) => ({
        ...segment,
        translatedText: segment.text,
      }));
    }

    try {
      // Process segments in chunks to avoid AWS Translate limits
      // AWS Translate has a maximum batch size, so we'll process in batches
      const batchSize = 25; // AWS Translate has a default limit of 25 documents per batch
      const translatedSegments: TranslationSegment[] = [];

      for (let i = 0; i < segments.length; i += batchSize) {
        const batch = segments.slice(i, i + batchSize);

        // Process batch in parallel using Promise.all
        const batchPromises = batch.map(async (segment) => {
          // Check cache first
          const cacheKey = this.generateCacheKey(
            segment.text,
            sourceLanguage,
            targetLanguage,
          );
          const cachedResult = this.cache.get(cacheKey);

          if (cachedResult && this.isCacheValid(cachedResult.timestamp)) {
            return {
              ...segment,
              translatedText: cachedResult.translatedText,
            };
          }

          // Translate the segment
          const translatedText = await this.translateText(
            segment.text,
            sourceLanguage,
            targetLanguage,
          );

          // Return the segment with the translated text
          return {
            ...segment,
            translatedText,
          };
        });

        const translatedBatch = await Promise.all(batchPromises);
        translatedSegments.push(...translatedBatch);
      }

      return translatedSegments;
    } catch (error) {
      console.error("Error translating segments with AWS Translate:", error);
      throw new Error(
        `Failed to translate segments: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Translates a complete transcription from one language to another
   * @param recordingId The ID of the recording
   * @param transcriptionData The transcription data to translate
   * @param targetLanguage The target language code (e.g., 'en', 'ja', 'es')
   * @returns A promise that resolves to the translated transcription data
   */
  async translateTranscription(
    recordingId: string,
    transcriptionData: TranscriptionData,
    targetLanguage: string,
  ): Promise<TranslationResult> {
    // Extract source language from transcription data
    const sourceLanguage = transcriptionData.languageCode.split("-")[0];

    // Skip translation if languages are the same
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: transcriptionData.text,
        sourceLanguage,
        targetLanguage,
        segments: transcriptionData.items?.map((item) => ({
          ...item,
          translatedText: item.text,
        })),
        timestamp: new Date(),
      };
    }

    try {
      // Translate the full text
      const translatedText = await this.translateText(
        transcriptionData.text,
        sourceLanguage,
        targetLanguage,
      );

      // Translate individual segments if they exist
      let translatedSegments: TranslationSegment[] | undefined;
      if (transcriptionData.items && transcriptionData.items.length > 0) {
        translatedSegments = await this.translateSegments(
          transcriptionData.items,
          sourceLanguage,
          targetLanguage,
        );
      }

      // Return the complete translation result
      return {
        translatedText,
        sourceLanguage,
        targetLanguage,
        segments: translatedSegments,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(
        `Error translating transcription for recording ${recordingId}:`,
        error,
      );
      throw new Error(
        `Failed to translate transcription: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Normalizes language codes to AWS Translate format
   * @param languageCode The language code (e.g., 'en-US', 'ja', 'zh-CN')
   * @returns The normalized language code for AWS Translate
   */
  private normalizeLanguageCode(languageCode: string): LanguageCodeString {
    // Extract the base language code without region
    // AWS Translate uses 2-letter language codes without region
    const baseLanguage = languageCode.split("-")[0].toLowerCase();

    // Map to AWS Translate supported language codes if needed
    // AWS Translate generally uses ISO 639-1 codes
    switch (baseLanguage) {
      case "en":
      case "es":
      case "fr":
      case "de":
      case "it":
      case "ja":
      case "ko":
      case "pt":
      case "ru":
      case "zh":
      case "ar":
      case "hi":
      case "cs":
      case "da":
      case "fi":
      case "he":
      case "id":
      case "nl":
      case "no":
      case "pl":
      case "sv":
      case "tr":
      case "uk":
      case "vi":
        return baseLanguage as LanguageCodeString;
      // Add specific mappings for any special cases
      case "zh-tw":
      case "zh-hk":
        return "zh-TW" as LanguageCodeString;
      default:
        // Default to the base language if no specific mapping
        return baseLanguage as LanguageCodeString;
    }
  }
}
