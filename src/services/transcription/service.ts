import { AWSTranscribeService } from "./AWSTranscribeService";
import type { TranscriptionService } from "./TranscriptionService";

let instance: TranscriptionService | null = null;

export function getTranscriptionService(): TranscriptionService {
  if (!instance) {
    instance = new AWSTranscribeService();
  }
  return instance;
}

export function setTranscriptionService(service: TranscriptionService): void {
  instance = service;
}

export function resetTranscriptionService(): void {
  instance = null;
}

export const transcriptionService = getTranscriptionService();
