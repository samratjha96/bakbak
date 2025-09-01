/**
 * Server functions for managing transcription jobs
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { transcribe } from "~/lib/transcribe";
import {
  fetchRecording,
  updateRecordingTranscriptionStatus,
  getRecordingPath,
  updateRecordingTranscription,
} from "~/lib/recordings";
import { AppError } from "~/utils/errorHandling";
import { TranscriptionStatus } from "~/types/recording";
import { romanizeText } from "~/lib/ai-romanization/service";
import {
  getDefaultScriptForLanguage,
  isSupportedTranslateLanguage,
} from "~/lib/languages";

// Response type for start transcription
export interface StartTranscriptionResponse {
  status: number;
  message: string;
  recordingId: string;
  jobId?: string;
  requestedAt: string;
}

// Response type for checking transcription status
export interface TranscriptionStatusResponse {
  status: number;
  transcriptionStatus: TranscriptionStatus;
  jobStatus: string;
  errorMessage?: string;
  text?: string;
  romanizedText?: string;
  languageCode?: string;
  sourceScriptCode?: string;
  targetScriptCode?: string;
  recordingId: string;
  requestedAt: string;
}

/**
 * Start a transcription job
 */
export const startTranscriptionJob = createServerFn({ method: "POST" })
  .validator(
    (params: { recordingId: string; target_language?: string }) => params,
  )
  .handler(
    async ({
      data: { recordingId, target_language },
    }): Promise<StartTranscriptionResponse> => {
      // Fetch the recording
      let recording;
      try {
        recording = await fetchRecording({ data: recordingId });
      } catch (error) {
        throw notFound();
      }

      // Check if transcription is already in progress
      if (recording.transcriptionStatus === "IN_PROGRESS") {
        return {
          status: 409,
          message: "Transcription already in progress",
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }

      // Update status to IN_PROGRESS
      await updateRecordingTranscriptionStatus({
        data: { id: recordingId, status: "IN_PROGRESS" },
      });

      try {
        // Get S3 URI and start transcription
        const { s3Uri } = await getRecordingPath({ data: recordingId });
        const languageCode = recording.language || "hi";
        console.log(`[Transcribe] Starting job for ${recordingId}`);
        const jobId = await transcribe.startTranscription(
          recordingId,
          s3Uri,
          languageCode,
        );

        // Update with job ID
        await updateRecordingTranscriptionStatus({
          data: {
            id: recordingId,
            status: "IN_PROGRESS",
            jobId: jobId,
          },
        });
        console.log(`[Transcribe] Started job ${jobId} for ${recordingId}`);

        return {
          status: 202,
          message: "Transcription started",
          recordingId,
          jobId,
          requestedAt: new Date().toISOString(),
        };
      } catch (error) {
        // Update to FAILED status
        console.error(
          `[Transcribe] Failed to start job for ${recordingId}: ${error}`,
        );
        await updateRecordingTranscriptionStatus({
          data: { id: recordingId, status: "FAILED" },
        });

        throw new AppError(
          `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
        );
      }
    },
  );

/**
 * Get transcription job status
 */
export const getTranscriptionJobStatus = createServerFn({ method: "GET" })
  .validator((params: { recordingId: string }) => params)
  .handler(
    async ({ data: { recordingId } }): Promise<TranscriptionStatusResponse> => {
      // Fetch the recording
      let recording;
      try {
        recording = await fetchRecording({ data: recordingId });
      } catch (error) {
        throw notFound();
      }

      // If transcription already marked completed in DB, short-circuit to avoid reprocessing
      if (recording.transcriptionStatus === "COMPLETED") {
        return {
          status: 200,
          transcriptionStatus: "COMPLETED",
          jobStatus: "COMPLETED",
          text: recording.transcriptionText,
          romanizedText: recording.transcription?.romanization,
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }

      // Check for job ID
      if (!recording.transcriptionUrl) {
        return {
          status: 400,
          transcriptionStatus: recording.transcriptionStatus,
          jobStatus: "NOT_FOUND",
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }

      const jobId = recording.transcriptionUrl;

      try {
        const status = await transcribe.getTranscriptionStatus(jobId);

        // Handle completed job
        if (status.status === "COMPLETED") {
          console.log(`[Transcribe] Job ${jobId} completed, retrieving result`);
          const result = await transcribe.getTranscriptionResult(jobId);

          // Attempt AI-powered romanization if needed
          let romanizedText =
            recording.transcription?.romanization || result.text;
          let languageCode: string | undefined =
            recording.language || undefined;

          try {
            if (!recording.transcription?.romanization && languageCode) {
              if (isSupportedTranslateLanguage(languageCode)) {
                const sourceScriptCode =
                  getDefaultScriptForLanguage(languageCode);
                if (sourceScriptCode && sourceScriptCode !== "Latn") {
                  console.log(
                    `[Transcribe] Performing AI romanization for ${recordingId} lang=${languageCode} ${sourceScriptCode}->Latn`,
                  );

                  const romanizationResponse = await romanizeText({
                    text: result.text,
                    sourceLanguage: languageCode as any,
                  });
                  romanizedText = romanizationResponse.romanizedText;

                  console.log(
                    `[Transcribe] AI romanization completed for ${recordingId}`,
                  );
                } else {
                  console.log(
                    `[Transcribe] Skipping romanization for ${recordingId} (script is already Latin or unknown)`,
                  );
                }
              } else {
                console.warn(
                  `[Transcribe] Unknown/unsupported language for AI romanization on ${recordingId}: ${languageCode}`,
                );
              }
            } else {
              console.log(
                `[Transcribe] Romanization already exists for ${recordingId}; skipping AI romanization`,
              );
            }
          } catch (aiError: any) {
            console.error(
              `[Transcribe] AI romanization failed for ${recordingId}: ${aiError?.message || aiError}`,
            );
            // Fall back to original text already set
          }

          // Persist transcription text and romanization in the transcriptions table
          try {
            await updateRecordingTranscription({
              data: {
                id: recordingId,
                transcription: {
                  text: result.text,
                  romanization: romanizedText.toLowerCase(),
                  isComplete: true,
                },
              },
            });
          } catch (persistError) {
            console.error(
              `[Transcribe] Failed to persist transcription/romanization for ${recordingId}: ${persistError}`,
            );
          }

          // Update status only (no text here) to ensure state is COMPLETE
          await updateRecordingTranscriptionStatus({
            data: {
              id: recordingId,
              status: "COMPLETED",
            },
          });

          return {
            status: 200,
            transcriptionStatus: "COMPLETED",
            jobStatus: status.status,
            text: result.text,
            romanizedText,
            languageCode,
            sourceScriptCode,
            targetScriptCode,
            recordingId,
            requestedAt: new Date().toISOString(),
          };
        }

        // Handle failed job
        if (status.status === "FAILED") {
          console.error(
            `[Transcribe] Job ${jobId} failed: ${status.errorMessage}`,
          );
          await updateRecordingTranscriptionStatus({
            data: { id: recordingId, status: "FAILED" },
          });
        }

        return {
          status: 200,
          transcriptionStatus: recording.transcriptionStatus,
          jobStatus: status.status,
          errorMessage: status.errorMessage,
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      } catch (error) {
        // Don't update the recording status on error checking status
        console.error(
          `[Transcribe] Error checking status for ${jobId}: ${error}`,
        );
        return {
          status: 500,
          transcriptionStatus: recording.transcriptionStatus,
          jobStatus: "ERROR",
          errorMessage: error instanceof Error ? error.message : String(error),
          recordingId,
          requestedAt: new Date().toISOString(),
        };
      }
    },
  );
