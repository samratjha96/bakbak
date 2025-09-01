/**
 * Romanization Types
 *
 * Minimal, focused types for AI-powered romanization.
 */

/**
 * Source language identifier.
 * Accept BCP‑47/ISO codes or human-readable names (e.g., "hi", "hindi").
 */
export type SupportedLanguage = string;

/**
 * Request payload for romanization
 */
export interface RomanizationRequest {
  text: string;
  sourceLanguage: SupportedLanguage;
}

/**
 * Response from romanization service
 */
export interface RomanizationResponse {
  romanizedText: string;
  sourceLanguage?: SupportedLanguage;
}
