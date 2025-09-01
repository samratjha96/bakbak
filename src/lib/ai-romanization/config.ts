/**
 * AI Romanization Configuration
 *
 * Centralized configuration for AWS Bedrock-powered romanization
 */

import {
  BEDROCK_MODELS,
  DEFAULT_MODEL_CONFIGS,
  type BedrockModelConfig,
  type SupportedLanguage,
} from "~/types/romanization";

export const AI_ROMANIZATION_CONFIG = {
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_BEARER_TOKEN: process.env.AWS_BEARER_TOKEN_BEDROCK,
  DEFAULT_MODEL: BEDROCK_MODELS.CLAUDE_3_HAIKU,
  MAX_TEXT_LENGTH: 10000,
} as const;

export const ROMANIZATION_PROMPT_TEMPLATE = `You are an expert linguist specializing in romanization of voice transcriptions. Romanize the following {language} text using standard conventions (e.g., Pinyin for Chinese, Hepburn for Japanese, Revised Romanization for Korean). Account for potential transcription errors and focus on readability. Return only the romanized text.`;

export function getRomanizationPrompt(language: SupportedLanguage): string {
  const displayLanguage =
    language === "unknown" ? "the detected language" : language;
  return ROMANIZATION_PROMPT_TEMPLATE.replace(/{language}/g, displayLanguage);
}
