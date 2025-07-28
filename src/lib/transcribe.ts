import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommandInput,
  TranscriptionJobStatus,
} from "@aws-sdk/client-transcribe";
import { transcribeClient } from "./transcribe-client";

/**
 * Simple, focused transcription service - no unnecessary abstractions.
 * Uses AWS Transcribe for real transcriptions.
 */
export class Transcribe {
  private client: TranscribeClient;
  private region: string;

  constructor(client: TranscribeClient = transcribeClient) {
    this.client = client;
    this.region = process.env.AWS_REGION || "us-east-1";
  }

  /**
   * Start a transcription job
   */
  async startTranscription(
    recordingId: string,
    audioUrl: string,
    languageCode: string = "en-US",
  ): Promise<string> {
    const timestamp = new Date().getTime();
    const jobName = `transcription-${recordingId}-${timestamp}`;

    const params: StartTranscriptionJobCommandInput = {
      TranscriptionJobName: jobName,
      LanguageCode: languageCode as any,
      Media: {
        MediaFileUri: audioUrl,
      },
      MediaFormat: "mp3", // Default format
      OutputBucketName: process.env.AWS_S3_BUCKET,
    };

    await this.client.send(new StartTranscriptionJobCommand(params));
    return jobName;
  }

  /**
   * Get transcription job status
   */
  async getTranscriptionStatus(jobId: string): Promise<{
    status: string;
    errorMessage?: string;
  }> {
    try {
      const response = await this.client.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: jobId,
        }),
      );

      const job = response.TranscriptionJob;
      if (!job) {
        throw new Error("Transcription job not found");
      }

      return {
        status: job.TranscriptionJobStatus || "UNKNOWN",
        errorMessage: job.FailureReason,
      };
    } catch (error) {
      console.error("Error getting transcription status:", error);
      throw new Error(
        `Failed to get transcription status: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get transcription result
   */
  async getTranscriptionResult(jobId: string): Promise<{
    text: string;
    items?: Array<{
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }>;
  }> {
    const statusResponse = await this.getTranscriptionStatus(jobId);

    if (statusResponse.status !== "COMPLETED") {
      throw new Error(
        `Transcription not ready. Status: ${statusResponse.status}${
          statusResponse.errorMessage
            ? `, Error: ${statusResponse.errorMessage}`
            : ""
        }`,
      );
    }

    try {
      const response = await this.client.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: jobId,
        }),
      );

      const job = response.TranscriptionJob;
      if (!job?.Transcript?.TranscriptFileUri) {
        throw new Error("No transcript file available");
      }

      // Download and parse the transcript file
      const transcriptResponse = await fetch(job.Transcript.TranscriptFileUri);
      const transcriptData = await transcriptResponse.json();

      return {
        text: transcriptData.results?.transcripts?.[0]?.transcript || "",
        items: transcriptData.results?.items?.map((item: any) => ({
          text: item.alternatives?.[0]?.content || "",
          startTime: parseFloat(item.start_time || "0"),
          endTime: parseFloat(item.end_time || "0"),
          confidence: parseFloat(item.alternatives?.[0]?.confidence || "0"),
        })),
      };
    } catch (error) {
      console.error("Error getting transcription result:", error);
      throw new Error(
        `Failed to get transcription result: ${(error as Error).message}`,
      );
    }
  }
}

// Default instance
export const transcribe = new Transcribe();
