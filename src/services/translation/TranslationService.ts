/**
 * Interface for translation services
 */
export interface TranslationService {
  /**
   * Translates a text string from one language to another
   * @param text The text to translate
   * @param sourceLanguage The source language code (e.g., 'en', 'ja', 'es')
   * @param targetLanguage The target language code (e.g., 'en', 'ja', 'es')
   * @returns A promise that resolves to the translated text
   */
  translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string>;

  /**
   * Translates an array of text segments from one language to another
   * @param segments The segments to translate (array of objects with text property)
   * @param sourceLanguage The source language code (e.g., 'en', 'ja', 'es')
   * @param targetLanguage The target language code (e.g., 'en', 'ja', 'es')
   * @returns A promise that resolves to an array of translated segments
   */
  translateSegments(
    segments: TranslationSegment[],
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationSegment[]>;

  /**
   * Translates a complete transcription from one language to another
   * @param recordingId The ID of the recording
   * @param transcriptionData The transcription data to translate
   * @param targetLanguage The target language code (e.g., 'en', 'ja', 'es')
   * @returns A promise that resolves to the translated transcription data
   */
  translateTranscription(
    recordingId: string,
    transcriptionData: TranscriptionData,
    targetLanguage: string,
  ): Promise<TranslationResult>;
}

/**
 * Represents a segment of text to be translated
 */
export interface TranslationSegment {
  /**
   * The text content to translate
   */
  text: string;

  /**
   * Optional start time in seconds (for transcription segments)
   */
  startTime?: number;

  /**
   * Optional end time in seconds (for transcription segments)
   */
  endTime?: number;

  /**
   * Optional speaker identifier (for transcription segments)
   */
  speaker?: string;

  /**
   * The translated text (filled in after translation)
   */
  translatedText?: string;
}

/**
 * Represents transcription data to be translated
 */
export interface TranscriptionData {
  /**
   * The complete transcription text
   */
  text: string;

  /**
   * The language code of the transcription
   */
  languageCode: string;

  /**
   * Optional segments with timing information
   */
  items?: TranslationSegment[];
}

/**
 * Result of a translation operation
 */
export interface TranslationResult {
  /**
   * The translated text
   */
  translatedText: string;

  /**
   * The source language code
   */
  sourceLanguage: string;

  /**
   * The target language code
   */
  targetLanguage: string;

  /**
   * Optional segments with translated text
   */
  segments?: TranslationSegment[];

  /**
   * Timestamp when the translation was performed
   */
  timestamp: Date;
}
