/**
 * AI Romanization Configuration
 *
 * Centralized configuration for AWS Bedrock-powered romanization
 */

import { type SupportedLanguage } from "~/types/romanization";

export const AI_ROMANIZATION_CONFIG = {
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_BEARER_TOKEN: process.env.AWS_BEARER_TOKEN_BEDROCK,
  DEFAULT_MODEL: process.env.AWS_BEDROCK_MODEL || "amazon.nova-pro-v1:0",
  MAX_TEXT_LENGTH: 10000,
} as const;

export function getRomanizationPrompt(language: SupportedLanguage): string {
  const langDisplay = language || "the detected language";
  return (
    `You are an expert linguist. Convert the input from its original script to Latin (romanization).\n` +
    `Source language (code or name): ${langDisplay}. Use your knowledge of language-specific romanization rules appropriate for this language.\n` +
    `Guidelines:\n` +
    `- Anticipate code-mixed English; keep genuine English words as-is and fix obvious misspellings.\n` +
    `- Prioritize intended meaning and natural, readable messaging style over letter-by-letter mapping.\n` +
    `- Avoid diacritics and special characters; plain ASCII where possible.\n` +
    `- Keep punctuation simple; no extra commentary.\n\n` +
    `Return only the romanized text.`
  );
}
