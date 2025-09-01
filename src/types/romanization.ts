/**
 * Romanization Types
 *
 * Types for AI-powered romanization functionality using AWS Bedrock
 */

/**
 * Supported languages for romanization
 */
export type SupportedLanguage =
  | "chinese"
  | "japanese"
  | "korean"
  | "arabic"
  | "hebrew"
  | "hindi"
  | "thai"
  | "russian"
  | "greek"
  | "bulgarian"
  | "serbian"
  | "macedonian"
  | "ukrainian"
  | "bengali"
  | "punjabi"
  | "gujarati"
  | "tamil"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "marathi"
  | "unknown";

/**
 * Romanization system preferences for different languages
 */
export type RomanizationSystem = {
  chinese: "pinyin" | "wade-giles" | "bopomofo";
  japanese: "hepburn" | "kunrei" | "nihon";
  korean: "revised" | "mccune-reischauer";
  arabic: "iso-233" | "din-31635" | "ala-lc";
  russian: "iso-9" | "gost" | "scientific";
};

/**
 * Request payload for romanization
 */
export interface RomanizationRequest {
  text: string;
  sourceLanguage: SupportedLanguage;
  system?: string; // Optional romanization system preference
  context?: string; // Additional context for better romanization
}

/**
 * Response from romanization service
 */
export interface RomanizationResponse {
  romanizedText: string;
  confidence?: number; // AI confidence score (0-1)
  sourceLanguage: SupportedLanguage;
  systemUsed?: string; // Which romanization system was applied
  processingTime?: number; // Time taken in milliseconds
}

/**
 * Error types for romanization failures
 */
export interface RomanizationError {
  code:
    | "AUTHENTICATION_ERROR"
    | "MODEL_ERROR"
    | "VALIDATION_ERROR"
    | "RATE_LIMIT_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  details?: string;
  retryable: boolean;
}

/**
 * Configuration for Bedrock models
 */
export interface BedrockModelConfig {
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  region?: string;
}

/**
 * Available Bedrock models for romanization
 */
export const BEDROCK_MODELS = {
  // Claude models - best for accuracy and context understanding
  CLAUDE_3_HAIKU: "anthropic.claude-3-haiku-20240307-v1:0",
  CLAUDE_3_SONNET: "anthropic.claude-3-sonnet-20240229-v1:0",
  CLAUDE_3_5_SONNET: "anthropic.claude-3-5-sonnet-20241022-v2:0",

  // Llama models - cost-effective alternatives
  LLAMA_3_8B: "meta.llama3-8b-instruct-v1:0",
  LLAMA_3_70B: "meta.llama3-70b-instruct-v1:0",
  LLAMA_3_1_405B: "meta.llama3-1-405b-instruct-v1",
} as const;

/**
 * Default model configurations
 */
export const DEFAULT_MODEL_CONFIGS: Record<string, BedrockModelConfig> = {
  [BEDROCK_MODELS.CLAUDE_3_HAIKU]: {
    modelId: BEDROCK_MODELS.CLAUDE_3_HAIKU,
    maxTokens: 2048,
    temperature: 0.1, // Low temperature for consistency
  },
  [BEDROCK_MODELS.CLAUDE_3_SONNET]: {
    modelId: BEDROCK_MODELS.CLAUDE_3_SONNET,
    maxTokens: 2048,
    temperature: 0.1,
  },
  [BEDROCK_MODELS.LLAMA_3_8B]: {
    modelId: BEDROCK_MODELS.LLAMA_3_8B,
    maxTokens: 2048,
    temperature: 0.1,
  },
};

/**
 * Language detection confidence thresholds
 */
export const LANGUAGE_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Romanization quality metrics
 */
export interface RomanizationMetrics {
  totalRequests: number;
  successRate: number;
  averageProcessingTime: number;
  modelUsage: Record<string, number>;
  errorRate: number;
  costPerRequest?: number;
}
