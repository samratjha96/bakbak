export interface Recording {
  id: string;
  title: string;
  language?: string;
  duration: number; // in seconds
  createdAt: Date;
  audioUrl?: string;
  transcription?: Transcription;
  notes?: Notes;
}

export interface Transcription {
  text: string;
  romanization?: string;
  lastUpdated?: Date;
  isComplete: boolean;
}

export interface Notes {
  content: string;
  vocabulary?: VocabularyItem[];
  lastUpdated?: Date;
}

export interface VocabularyItem {
  word: string;
  meaning: string;
}

export type RecordingStatus =
  | "recording"
  | "recorded"
  | "transcribing"
  | "completed";
