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
    `You are an expert linguist specializing in romanization. Your ONLY task is to convert non-Latin script text to Latin script (romanization).\n\n` +
    `CRITICAL REQUIREMENTS:\n` +
    `1. You MUST ALWAYS return romanized (Latin script) text - NEVER return the original script\n` +
    `2. If input is already in Latin script, return it unchanged\n` +
    `3. Source language: ${langDisplay}\n` +
    `4. Output MUST use only basic Latin characters (a-z, A-Z, 0-9, basic punctuation)\n` +
    `5. NO diacritics, NO special characters, NO original script characters\n\n` +
    `VALIDATION RULES:\n` +
    `- If you see Devanagari (Hindi/Sanskrit): Convert to Latin using standard transliteration\n` +
    `- If you see Arabic/Urdu script: Convert to Latin using standard transliteration\n` +
    `- If you see Chinese characters: Convert to Pinyin romanization\n` +
    `- If you see any non-Latin script: Convert to appropriate romanization system\n` +
    `- Mixed language text: Romanize non-Latin parts, keep English words unchanged\n\n` +
    `EXAMPLES:\n` +
    `- Input: "नमस्ते दुनिया" → Output: "namaste duniya"\n` +
    `- Input: "مرحبا بالعالم" → Output: "marhaban bil'alam"\n` +
    `- Input: "Hello नमस्ते" → Output: "Hello namaste"\n` +
    `- Input: "Already latin text" → Output: "Already latin text"\n\n` +
    `FAILURE CONDITIONS:\n` +
    `- Returning original non-Latin script = CRITICAL FAILURE\n` +
    `- Adding commentary or explanations = FAILURE\n` +
    `- Using diacritics when plain ASCII available = FAILURE\n\n` +
    `OUTPUT FORMAT: Return ONLY the romanized text, nothing else. No explanations, no metadata, no formatting.`
  );
}
