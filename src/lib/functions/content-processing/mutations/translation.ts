/**
 * ABOUTME: Content processing translation mutation server functions
 * ABOUTME: Handles creating translations for recordings
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";
import { updateRecordingTranslation } from "~/lib/functions/recordings/mutations/translation";
import { translate } from "~/lib/translate";
import { normalizeTranslateLanguage } from "~/lib/languages";

export const translateRecording = createServerFn({ method: "POST" })
  .inputValidator((data: { recordingId: string; targetLanguage?: string }) => {
    return z
      .object({
        recordingId: z.string(),
        targetLanguage: z.string().default("en"),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { recordingId, targetLanguage } = data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    if (!recording.isTranscribed || !recording.transcriptionText) {
      throw new Error("No transcription available to translate");
    }

    const sourceLang = recording.language || "auto";
    const translatedText = await translate.translateText(
      recording.transcriptionText,
      sourceLang,
      normalizeTranslateLanguage(targetLanguage),
    );

    const updatedRecording = await updateRecordingTranslation({
      data: {
        id: recordingId,
        translationText: translatedText,
        translationLanguage: targetLanguage,
      },
    });

    return {
      translationText: updatedRecording.translationText,
      translationLanguage: updatedRecording.translationLanguage,
      recordingId,
    };
  });
