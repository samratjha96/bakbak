/**
 * Targeted data access functions to reduce over-fetching
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import {
  Recording,
  Transcription,
  TranscriptionStatus,
} from "~/types/recording";
import { fetchRecording } from "./recordings";
import { createLogger } from "./logger";
import { AppError } from "./errorHandling";

const logger = createLogger("DataAccess");

// Transcription data shape
export interface TranscriptionData {
  transcriptionText: string | undefined;
  transcriptionStatus: TranscriptionStatus;
  transcriptionLastUpdated?: Date;
  transcription?: Transcription;
}

// Translation data shape
export interface TranslationData {
  translationText: string | undefined;
  translationLanguage: string | undefined;
  translationLastUpdated?: Date;
  isTranslated: boolean;
}

// Server function to fetch only transcription data
export const fetchTranscriptionData = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<TranscriptionData> => {
    logger.info(`Fetching transcription data for recording ${id}`);

    try {
      const recording = await fetchRecording({ data: id });

      return {
        transcriptionText: recording.transcriptionText,
        transcriptionStatus: recording.transcriptionStatus,
        transcriptionLastUpdated: recording.transcriptionLastUpdated,
        transcription: recording.transcription,
      };
    } catch (error) {
      if (error === notFound()) {
        logger.error(`Recording not found: ${id}`);
        throw notFound();
      }
      logger.error(`Error fetching transcription data:`, error);
      throw new AppError(
        `Failed to fetch transcription data: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  });

// React Query options for transcription data
export const transcriptionDataQueryOptions = (recordingId: string) =>
  queryOptions({
    queryKey: ["transcription", recordingId],
    queryFn: () => fetchTranscriptionData({ data: recordingId }),
  });

// Server function to fetch only translation data
export const fetchTranslationData = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<TranslationData> => {
    logger.info(`Fetching translation data for recording ${id}`);

    try {
      const recording = await fetchRecording({ data: id });

      return {
        translationText: recording.translationText,
        translationLanguage: recording.translationLanguage,
        translationLastUpdated: recording.translationLastUpdated,
        isTranslated: recording.isTranslated,
      };
    } catch (error) {
      if (error === notFound()) {
        logger.error(`Recording not found: ${id}`);
        throw notFound();
      }
      logger.error(`Error fetching translation data:`, error);
      throw new AppError(
        `Failed to fetch translation data: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  });

// React Query options for translation data
export const translationDataQueryOptions = (recordingId: string) =>
  queryOptions({
    queryKey: ["translation", recordingId],
    queryFn: () => fetchTranslationData({ data: recordingId }),
  });

// Basic recording data without large text fields
export interface BasicRecordingData {
  id: string;
  title: string;
  language?: string;
  duration: number;
  createdAt: Date;
  isTranscribed: boolean;
  isTranslated: boolean;
  transcriptionStatus: TranscriptionStatus;
}

// Server function to fetch only basic recording data (without large text fields)
export const fetchBasicRecordingData = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<BasicRecordingData> => {
    logger.info(`Fetching basic data for recording ${id}`);

    try {
      const recording = await fetchRecording({ data: id });

      return {
        id: recording.id,
        title: recording.title,
        language: recording.language,
        duration: recording.duration,
        createdAt: recording.createdAt,
        isTranscribed: recording.isTranscribed,
        isTranslated: recording.isTranslated,
        transcriptionStatus: recording.transcriptionStatus,
      };
    } catch (error) {
      if (error === notFound()) {
        logger.error(`Recording not found: ${id}`);
        throw notFound();
      }
      logger.error(`Error fetching basic recording data:`, error);
      throw new AppError(
        `Failed to fetch basic recording data: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  });

// React Query options for basic recording data
export const basicRecordingDataQueryOptions = (recordingId: string) =>
  queryOptions({
    queryKey: ["recording-basic", recordingId],
    queryFn: () => fetchBasicRecordingData({ data: recordingId }),
  });
