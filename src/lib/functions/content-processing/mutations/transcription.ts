/**
 * ABOUTME: Content processing transcription mutation server functions
 * ABOUTME: Handles starting transcription jobs and transliteration operations
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { fetchRecording } from "~/lib/functions/recordings/queries/fetch";
import { updateRecordingTranscriptionStatus } from "~/lib/functions/recordings/mutations/transcription";
import { getRecordingPresignedUrl } from "~/lib/functions/recordings/queries/paths";
import { transcribe } from "~/lib/transcribe";

export const transcribeRecording = createServerFn({ method: "POST" })
  .inputValidator((data: { recordingId: string; target_language?: string }) => {
    return z
      .object({
        recordingId: z.string(),
        target_language: z.string().optional(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { recordingId } = data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    if (recording.transcriptionStatus === "IN_PROGRESS") {
      throw new Error("Transcription already in progress");
    }

    await updateRecordingTranscriptionStatus({
      data: {
        id: recordingId,
        status: "IN_PROGRESS",
      },
    });

    const { url: audioUrl } = await getRecordingPresignedUrl({
      data: recordingId,
    });

    const languageCode = recording.language || "hi";
    const jobId = await transcribe.startTranscription(
      recordingId,
      audioUrl,
      languageCode,
    );

    await updateRecordingTranscriptionStatus({
      data: {
        id: recordingId,
        status: "IN_PROGRESS",
        jobId,
      },
    });

    return { jobId, recordingId };
  });

export const transliterateRecording = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      recordingId: string;
      languageCode?: string;
      sourceScriptCode?: string;
      targetScriptCode?: string;
    }) => {
      return z
        .object({
          recordingId: z.string(),
          languageCode: z.string().optional(),
          sourceScriptCode: z.string().optional(),
          targetScriptCode: z.string().default("Latn"),
        })
        .parse(data);
    },
  )
  .handler(async ({ data }) => {
    const { recordingId, languageCode, sourceScriptCode, targetScriptCode } =
      data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    const sourceText = recording.translationText || recording.transcriptionText;
    if (!sourceText) {
      throw new Error("No text available to romanize");
    }

    const lang =
      languageCode || recording.translationLanguage || recording.language || "";

    return {
      originalText: sourceText,
      transliteratedText: sourceText, // Placeholder - implement actual transliteration
      language: lang,
      sourceScript: sourceScriptCode,
      targetScript: targetScriptCode,
      recordingId,
    };
  });