import {
  TranslateClient,
  TranslateTextCommand,
  TranslateTextCommandInput,
} from "@aws-sdk/client-translate";
import { translateClient } from "./translate-client";
import { normalizeTranslateLanguage } from "~/lib/languages";

/**
 * Simple, focused translation service - no unnecessary abstractions.
 * Uses AWS Translate for real translations, with basic caching.
 */
export class Translate {
  private client: TranslateClient;
  private cache = new Map<string, { text: string; timestamp: number }>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor(client: TranslateClient = translateClient) {
    this.client = client;
  }

  /**
   * Translate text from one language to another
   */
  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    // Skip if same language
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    // Check cache
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${text.slice(0, 50)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.text;
    }

    try {
      const input: TranslateTextCommandInput = {
        Text: text,
        // Allow 'auto' to pass through for source detection
        SourceLanguageCode:
          sourceLanguage === "auto"
            ? ("auto" as any)
            : this.normalizeLanguage(sourceLanguage),
        TargetLanguageCode: this.normalizeLanguage(targetLanguage),
      };

      const response = await this.client.send(new TranslateTextCommand(input));

      if (!response.TranslatedText) {
        throw new Error("No translated text received");
      }

      // Cache result
      this.cache.set(cacheKey, {
        text: response.TranslatedText,
        timestamp: Date.now(),
      });

      return response.TranslatedText;
    } catch (error) {
      console.error("Translation failed:", error);
      throw new Error(`Translation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Normalize language codes for AWS Translate
   */
  private normalizeLanguage(code: string): string {
    // Use the centralized language module for normalization
    return normalizeTranslateLanguage(code);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Default instance
export const translate = new Translate();

// Mock for development/testing
export class MockTranslate {
  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    if (sourceLanguage === targetLanguage) {
      return text;
    }
    return `[${targetLanguage}] ${text}`;
  }

  clearCache(): void {
    // No-op for mock
  }
}

// Use mock in development/test
export const mockTranslate = new MockTranslate();
