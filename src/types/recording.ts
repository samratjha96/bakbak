export interface Recording {
  id: string;
  title: string;
  language?: string;
  duration: number; // in seconds
  createdAt: Date;
  audioUrl?: string;
  transcription?: Transcription;
  notes?: Notes;
  isTranscribed: boolean;
  transcriptionStatus: TranscriptionStatus;
  transcriptionUrl?: string;
  transcriptionText?: string;
  transcriptionLastUpdated?: Date;
  isTranslated: boolean;
  translationUrl?: string;
  translationText?: string;
  translationLanguage?: string;
  translationLastUpdated?: Date;
}

export interface Transcription {
  text: string;
  romanization?: string;
  lastUpdated?: Date;
  isComplete: boolean;
}

export interface Notes {
  content: string;
  lastUpdated?: Date;
}

export type RecordingStatus =
  | "recording"
  | "recorded"
  | "transcribing"
  | "completed";

export type TranscriptionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";
