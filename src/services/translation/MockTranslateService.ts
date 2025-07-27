import {
  TranslationService,
  TranslationSegment,
  TranscriptionData,
  TranslationResult,
} from "./TranslationService";

/**
 * A mock implementation of the TranslationService for testing
 */
export class MockTranslateService implements TranslationService {
  /**
   * Simple mock translation that just reverses the text
   * @param text The text to "translate"
   * @param sourceLanguage The source language code
   * @param targetLanguage The target language code
   * @returns A promise that resolves to the "translated" text
   */
  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    // Skip "translation" if languages are the same
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    // For demo purposes, we'll just add a language prefix to the text
    return `[${targetLanguage}] ${text}`;
  }

  /**
   * Translates an array of text segments
   * @param segments The segments to translate
   * @param sourceLanguage The source language code
   * @param targetLanguage The target language code
   * @returns A promise that resolves to an array of translated segments
   */
  async translateSegments(
    segments: TranslationSegment[],
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationSegment[]> {
    // Skip "translation" if languages are the same
    if (sourceLanguage === targetLanguage) {
      return segments.map((segment) => ({
        ...segment,
        translatedText: segment.text,
      }));
    }

    // Process each segment
    const translatedSegments = segments.map(async (segment) => {
      const translatedText = await this.translateText(
        segment.text,
        sourceLanguage,
        targetLanguage,
      );

      return {
        ...segment,
        translatedText,
      };
    });

    return Promise.all(translatedSegments);
  }

  /**
   * Translates a complete transcription
   * @param recordingId The ID of the recording
   * @param transcriptionData The transcription data to translate
   * @param targetLanguage The target language code
   * @returns A promise that resolves to the translated transcription data
   */
  async translateTranscription(
    recordingId: string,
    transcriptionData: TranscriptionData,
    targetLanguage: string,
  ): Promise<TranslationResult> {
    // Extract source language from transcription data
    const sourceLanguage = transcriptionData.languageCode.split("-")[0];

    // Skip "translation" if languages are the same
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
  }
}
