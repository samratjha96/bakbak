/**
 * Server functions for recording operations
 * Co-located with the recordings route but extracted for maintainability
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import {
  fetchRecording,
  updateRecordingTranslation,
  updateRecordingTranscriptionStatus,
  getRecordingPresignedUrl,
} from "~/lib/recordings";
import { translate } from "~/lib/translate";
import { normalizeTranslateLanguage } from "~/lib/languages";
import { transcribe } from "~/lib/transcribe";

export const translateRecording = createServerFn({ method: "POST" })
  .validator((data: { recordingId: string; targetLanguage?: string }) => {
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

export const transcribeRecording = createServerFn({ method: "POST" })
  .validator((data: { recordingId: string; target_language?: string }) => {
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

export const getTranscription = createServerFn({ method: "GET" })
  .validator((data: { recordingId: string }) => {
    return z
      .object({
        recordingId: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { recordingId } = data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    if (
      !recording.isTranscribed ||
      recording.transcriptionStatus !== "COMPLETED"
    ) {
      throw new Error("No completed transcription found for this recording");
    }

    let transcriptionResult = null;
    if (recording.transcriptionUrl) {
      try {
        const jobId = recording.transcriptionUrl.split("/").pop() || "";
        transcriptionResult = await transcribe.getTranscriptionResult(jobId);
      } catch (error) {
        console.error("Error fetching detailed transcription result:", error);
      }
    }

    return {
      transcription: recording.transcription,
      transcriptionText: recording.transcriptionText,
      transcriptionLastUpdated: recording.transcriptionLastUpdated,
      detailedResult: transcriptionResult,
      recordingId,
    };
  });

export const getTranslation = createServerFn({ method: "GET" })
  .validator((data: { recordingId: string }) => {
    return z
      .object({
        recordingId: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { recordingId } = data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    if (!recording.isTranslated || !recording.translationText) {
      throw new Error("No translation found for this recording");
    }

    return {
      translationText: recording.translationText,
      translationLanguage: recording.translationLanguage,
      translationLastUpdated: recording.translationLastUpdated,
      translationUrl: recording.translationUrl,
      recordingId,
    };
  });

export const transliterateRecording = createServerFn({ method: "POST" })
  .validator(
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

export const getTranscriptionJobStatus = createServerFn({ method: "GET" })
  .validator((data: { recordingId: string }) => {
    return z
      .object({
        recordingId: z.string(),
      })
      .parse(data);
  })
  .handler(async ({ data }) => {
    const { recordingId } = data;

    const recording = await fetchRecording({ data: recordingId });
    if (!recording) {
      throw notFound();
    }

    if (recording.transcriptionStatus === "COMPLETED") {
      return {
        transcriptionStatus: "COMPLETED",
        jobStatus: "COMPLETED",
        text: recording.transcriptionText,
        romanizedText: recording.transcription?.romanization,
        recordingId,
      };
    }

    if (!recording.transcriptionUrl) {
      return {
        transcriptionStatus: recording.transcriptionStatus,
        jobStatus: "NOT_FOUND",
        recordingId,
      };
    }

    return {
      transcriptionStatus: recording.transcriptionStatus,
      jobStatus: recording.transcriptionStatus,
      recordingId,
    };
  });
