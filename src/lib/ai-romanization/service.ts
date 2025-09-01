import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { bedrock, createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { isAuthenticated } from "~/database/connection";
import {
  type RomanizationRequest,
  type RomanizationResponse,
} from "~/types/romanization";
import { AI_ROMANIZATION_CONFIG, getRomanizationPrompt } from "./config";

async function romanizeWithBedrock(
  request: RomanizationRequest,
): Promise<RomanizationResponse> {
  const provider = createAmazonBedrock({
    region: AI_ROMANIZATION_CONFIG.AWS_REGION,
    apiKey: AI_ROMANIZATION_CONFIG.AWS_BEARER_TOKEN,
  });
  const model = provider(AI_ROMANIZATION_CONFIG.DEFAULT_MODEL);

  const systemPrompt = getRomanizationPrompt(request.sourceLanguage);
  const userPrompt = `Voice transcription to romanize (${request.sourceLanguage}):\n\n"${request.text}"`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2048,
    temperature: 0.1,
  });

  const romanizedText = result.text?.trim();
  if (!romanizedText) {
    throw new Error("AI model returned empty response");
  }

  return {
    romanizedText,
    sourceLanguage: request.sourceLanguage,
    processingTime: 0,
  };
}

export const romanizeText = createServerFn({ method: "POST" })
  .validator((data: RomanizationRequest) => {
    if (!data.text?.trim()) throw new Error("Text is required");
    if (data.text.length > AI_ROMANIZATION_CONFIG.MAX_TEXT_LENGTH) {
      throw new Error(
        `Text too long (max ${AI_ROMANIZATION_CONFIG.MAX_TEXT_LENGTH} chars)`,
      );
    }
    if (!data.sourceLanguage) throw new Error("Source language is required");
    return data;
  })
  .handler(async ({ data }) => {
    const authed = await isAuthenticated();
    if (!authed) throw new Error("Authentication required");

    return await romanizeWithBedrock(data);
  });
