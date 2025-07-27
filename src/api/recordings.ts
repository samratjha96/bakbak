import { createServerFn } from "@tanstack/react-start";
import { recordings } from "~/data/recordings";
import type {
  Recording,
  Transcription,
  Notes,
  TranscriptionStatus,
} from "~/types/recording";

// Simple server function wrappers - no complex validation ceremony

export const fetchRecordings = createServerFn({ method: "GET" }).handler(
  async () => recordings.getAll(),
);

export const fetchRecording = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => recordings.getById(id));

export const createRecording = createServerFn({ method: "POST" })
  .validator(
    (
      data: Omit<
        Recording,
        | "id"
        | "createdAt"
        | "isTranscribed"
        | "transcriptionStatus"
        | "isTranslated"
      >,
    ) => data,
  )
  .handler(async ({ data }) => recordings.create(data));

export const updateRecordingTranscription = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; transcription: Partial<Transcription> }) => data,
  )
  .handler(async ({ data }) =>
    recordings.updateTranscription(data.id, data.transcription),
  );

export const updateRecordingNotes = createServerFn({ method: "POST" })
  .validator((data: { id: string; notes: Partial<Notes> }) => data)
  .handler(async ({ data }) => recordings.updateNotes(data.id, data.notes));

export const updateRecordingTranscriptionStatus = createServerFn({
  method: "POST",
})
  .validator(
    (data: {
      id: string;
      status: TranscriptionStatus;
      transcriptionText?: string;
      transcriptionUrl?: string;
    }) => data,
  )
  .handler(async ({ data }) =>
    recordings.updateTranscriptionStatus(
      data.id,
      data.status,
      data.transcriptionText,
      data.transcriptionUrl,
    ),
  );

export const updateRecordingTranslation = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      translationText: string;
      translationLanguage: string;
      translationUrl?: string;
    }) => data,
  )
  .handler(async ({ data }) =>
    recordings.updateTranslation(
      data.id,
      data.translationText,
      data.translationLanguage,
      data.translationUrl,
    ),
  );

// Export query options for convenience
export { recordingsQuery, recordingQuery } from "~/data/recordings";
