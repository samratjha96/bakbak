/**
 * Consolidated content processing server functions
 * Handles transcription and translation operations
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { TranscriptionStatus } from "~/types/recording";
import {
  getDatabase,
  getCurrentUserId,
  isAuthenticated,
} from "~/database/connection";
import { 
  withErrorHandling, 
  ServerErrors, 
  validateRequired, 
  validateString,
  type ServerResponse 
} from "~/utils/server-errors";
import { createLogger } from "~/utils/logger";
import { translate } from "~/lib/translate";
import { normalizeTranslateLanguage } from "~/lib/languages";
import { fetchRecording, updateRecordingTranslation } from "~/lib/recordings";

const logger = createLogger("ContentProcessingServer");

// Shared interfaces
export interface ContentProcessingData {
  transcriptionText?: string;
  transcriptionStatus: TranscriptionStatus;
  transcriptionLastUpdated?: Date;
  romanization?: string;
  translationText?: string;
  translationLanguage?: string;
  translationLastUpdated?: Date;
  isTranslated: boolean;
}

export interface TranscriptionData {
  transcriptionText: string | undefined;
  transcriptionStatus: TranscriptionStatus;
  transcriptionLastUpdated?: Date;
  romanization?: string;
}

export interface TranslationData {
  translationText: string | undefined;
  translationLanguage: string | undefined;
  translationLastUpdated?: Date;
  isTranslated: boolean;
}

/**
 * Fetch complete content processing data for a recording
 * Includes both transcription and translation data in a single query
 */
export const fetchContentProcessingData = createServerFn({ method: "GET" })
  .validator((id: string) => {
    validateRequired(id, 'Recording ID');
    validateString(id, 'Recording ID');
    return id;
  })
  .handler(async ({ data: id }): Promise<ServerResponse<ContentProcessingData>> => {
    return withErrorHandling(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw ServerErrors.unauthorized();
      
      const db = getDatabase();
      
      const result = db
        .prepare(`
          SELECT 
            t.text as transcription_text,
            t.romanization,
            t.status as transcription_status,
            t.updated_at as transcription_updated_at,
            tr.text as translation_text,
            tr.target_language as translation_language,
            tr.status as translation_status,
            tr.updated_at as translation_updated_at
          FROM recordings r
          LEFT JOIN transcriptions t ON r.id = t.recording_id
          LEFT JOIN translations tr ON t.id = tr.transcription_id
          WHERE r.id = ? AND r.user_id = ?
        `)
        .get(id, userId) as {
          transcription_text?: string;
          romanization?: string;
          transcription_status?: string;
          transcription_updated_at?: string;
          translation_text?: string;
          translation_language?: string;
          translation_status?: string;
          translation_updated_at?: string;
        } | undefined;

      if (!result) {
        throw ServerErrors.notFound('Recording');
      }

      return {
        transcriptionText: result.transcription_text,
        transcriptionStatus: (result.transcription_status as TranscriptionStatus) || "NOT_STARTED",
        transcriptionLastUpdated: result.transcription_updated_at
          ? new Date(result.transcription_updated_at)
          : undefined,
        romanization: result.romanization,
        translationText: result.translation_text,
        translationLanguage: result.translation_language,
        translationLastUpdated: result.translation_updated_at
          ? new Date(result.translation_updated_at)
          : undefined,
        isTranslated: result.translation_status === "COMPLETED",
      };
    }, 'fetch_content_processing_data');
  });

/**
 * Fetch transcription data only (backward compatible)
 */
export const fetchTranscriptionData = createServerFn({ method: "GET" })
  .validator((id: string) => {
    validateRequired(id, 'Recording ID');
    validateString(id, 'Recording ID');
    return id;
  })
  .handler(async ({ data: id }): Promise<TranscriptionData> => {
    const userId = await getCurrentUserId();
    if (!userId) throw ServerErrors.unauthorized();
    
    const db = getDatabase();
    
    const result = db
      .prepare(`
        SELECT 
          t.text as transcription_text,
          t.romanization,
          t.status as transcription_status,
          t.updated_at as transcription_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        WHERE r.id = ? AND r.user_id = ?
      `)
      .get(id, userId) as {
        transcription_text?: string;
        romanization?: string;
        transcription_status?: string;
        transcription_updated_at?: string;
      } | undefined;

    if (!result) {
      throw ServerErrors.notFound('Recording');
    }

    return {
      transcriptionText: result.transcription_text,
      transcriptionStatus: (result.transcription_status as TranscriptionStatus) || "NOT_STARTED",
      transcriptionLastUpdated: result.transcription_updated_at
        ? new Date(result.transcription_updated_at)
        : undefined,
      romanization: result.romanization,
    };
  });

/**
 * Fetch translation data only (backward compatible)
 */
export const fetchTranslationData = createServerFn({ method: "GET" })
  .validator((id: string) => {
    validateRequired(id, 'Recording ID');
    validateString(id, 'Recording ID');
    return id;
  })
  .handler(async ({ data: id }): Promise<TranslationData> => {
    logger.info(`Fetching translation data for recording ${id}`);

    const userId = await getCurrentUserId();
    if (!userId) throw ServerErrors.unauthorized();
    
    const db = getDatabase();
    
    const result = db
      .prepare(`
        SELECT 
          tr.text as translation_text,
          tr.target_language as translation_language,
          tr.status as translation_status,
          tr.updated_at as translation_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        LEFT JOIN translations tr ON t.id = tr.transcription_id
        WHERE r.id = ? AND r.user_id = ?
      `)
      .get(id, userId) as {
        translation_text?: string;
        translation_language?: string;
        translation_status?: string;
        translation_updated_at?: string;
      } | undefined;

    if (!result) {
      throw ServerErrors.notFound('Recording');
    }

    return {
      translationText: result.translation_text,
      translationLanguage: result.translation_language,
      translationLastUpdated: result.translation_updated_at
        ? new Date(result.translation_updated_at)
        : undefined,
      isTranslated: result.translation_status === "COMPLETED",
    };
  });

/**
 * Create translation for a recording using AWS Translate and persist it (backward compatible)
 */
export const createTranslationForRecording = createServerFn({ method: "POST" })
  .validator((params: { recordingId: string; targetLanguage?: string }) => {
    validateRequired(params?.recordingId, 'Recording ID');
    validateString(params.recordingId, 'Recording ID');
    
    if (params.targetLanguage) {
      validateString(params.targetLanguage, 'Target language', 2, 10);
    }
    
    return params;
  })
  .handler(async ({ data: { recordingId, targetLanguage = "en" } }) => {
    logger.info(`Creating translation for recording ${recordingId} -> ${targetLanguage}`);

    // Fetch recording to validate and get language/transcription
    let recording: any;
    try {
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      throw ServerErrors.notFound('Recording');
    }

    if (!recording.isTranscribed || !recording.transcriptionText) {
      return {
        status: 400,
        message: "No transcription available to translate",
      };
    }

    // Perform translation
    const srcLang = recording.language || "auto";
    const tgtLang = normalizeTranslateLanguage(targetLanguage || "en");
    
    let translatedText: string;
    try {
      translatedText = await translate.translateText(
        recording.transcriptionText,
        srcLang,
        tgtLang,
      );
    } catch (error) {
      logger.error('Translation service error:', error);
      throw ServerErrors.internal("Translation service failed");
    }

    // Persist translation
    let updated: any;
    try {
      updated = await updateRecordingTranslation({
        data: {
          id: recordingId,
          translationText: translatedText,
          translationLanguage: tgtLang,
        },
      });
    } catch (error) {
      logger.error('Failed to persist translation:', error);
      throw ServerErrors.database("Failed to save translation");
    }

    return {
      status: 200,
      message: "Translation created",
      translationText: updated.translationText,
      translationLanguage: updated.translationLanguage,
      recordingId,
    };
  });

/**
 * Batch fetch transcription statuses for multiple recordings
 * Optimized version to prevent N+1 queries
 */
export const batchFetchTranscriptionStatuses = createServerFn({ method: "POST" })
  .validator((data: { recordingIds: string[] }) => {
    if (!Array.isArray(data?.recordingIds)) {
      throw ServerErrors.validation("recordingIds must be an array");
    }
    
    data.recordingIds.forEach(id => validateString(id, 'Recording ID'));
    return data;
  })
  .handler(async ({ data: { recordingIds } }): Promise<ServerResponse<Record<string, {
    status: TranscriptionStatus;
    lastUpdated?: Date;
  }>>> => {
    return withErrorHandling(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw ServerErrors.unauthorized();
      
      if (recordingIds.length === 0) return {};
      
      const db = getDatabase();
      const placeholders = recordingIds.map(() => '?').join(',');
      
      const results = db.prepare(`
        SELECT 
          r.id as recording_id,
          t.status as transcription_status,
          t.updated_at as transcription_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        WHERE r.id IN (${placeholders}) AND r.user_id = ?
      `).all(...recordingIds, userId) as {
        recording_id: string;
        transcription_status?: string;
        transcription_updated_at?: string;
      }[];
      
      const statusMap: Record<string, { status: TranscriptionStatus; lastUpdated?: Date }> = {};
      
      results.forEach(result => {
        statusMap[result.recording_id] = {
          status: (result.transcription_status as TranscriptionStatus) || "NOT_STARTED",
          lastUpdated: result.transcription_updated_at 
            ? new Date(result.transcription_updated_at)
            : undefined,
        };
      });
      
      return statusMap;
    }, 'batch_fetch_transcription_statuses');
  });

/**
 * Batch fetch translation statuses for multiple recordings
 */
export const batchFetchTranslationStatuses = createServerFn({ method: "POST" })
  .validator((data: { recordingIds: string[] }) => {
    if (!Array.isArray(data?.recordingIds)) {
      throw ServerErrors.validation("recordingIds must be an array");
    }
    
    data.recordingIds.forEach(id => validateString(id, 'Recording ID'));
    return data;
  })
  .handler(async ({ data: { recordingIds } }): Promise<ServerResponse<Record<string, {
    isTranslated: boolean;
    language?: string;
    lastUpdated?: Date;
  }>>> => {
    return withErrorHandling(async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw ServerErrors.unauthorized();
      
      if (recordingIds.length === 0) return {};
      
      const db = getDatabase();
      const placeholders = recordingIds.map(() => '?').join(',');
      
      const results = db.prepare(`
        SELECT 
          r.id as recording_id,
          tr.status as translation_status,
          tr.target_language as translation_language,
          tr.updated_at as translation_updated_at
        FROM recordings r
        LEFT JOIN transcriptions t ON r.id = t.recording_id
        LEFT JOIN translations tr ON t.id = tr.transcription_id
        WHERE r.id IN (${placeholders}) AND r.user_id = ?
      `).all(...recordingIds, userId) as {
        recording_id: string;
        translation_status?: string;
        translation_language?: string;
        translation_updated_at?: string;
      }[];
      
      const statusMap: Record<string, { isTranslated: boolean; language?: string; lastUpdated?: Date }> = {};
      
      results.forEach(result => {
        statusMap[result.recording_id] = {
          isTranslated: result.translation_status === "COMPLETED",
          language: result.translation_language,
          lastUpdated: result.translation_updated_at 
            ? new Date(result.translation_updated_at)
            : undefined,
        };
      });
      
      return statusMap;
    }, 'batch_fetch_translation_statuses');
  });

// Query helpers for TanStack Query
export const contentProcessingQuery = (recordingId: string) => ({
  queryKey: ['content-processing', recordingId],
  queryFn: () => fetchContentProcessingData({ data: recordingId }),
});

export const transcriptionQuery = (recordingId: string) => ({
  queryKey: ['transcription', recordingId],
  queryFn: () => fetchTranscriptionData({ data: recordingId }),
});

export const translationQuery = (recordingId: string) => ({
  queryKey: ['translation', recordingId],
  queryFn: () => fetchTranslationData({ data: recordingId }),
});

export const batchTranscriptionStatusQuery = (recordingIds: string[]) => ({
  queryKey: ['transcriptions', 'batch-status', recordingIds.sort()],
  queryFn: () => batchFetchTranscriptionStatuses({ data: { recordingIds } }),
  staleTime: 30000, // 30 seconds - status doesn't change frequently
});

export const batchTranslationStatusQuery = (recordingIds: string[]) => ({
  queryKey: ['translations', 'batch-status', recordingIds.sort()],
  queryFn: () => batchFetchTranslationStatuses({ data: { recordingIds } }),
  staleTime: 30000, // 30 seconds - status doesn't change frequently
});