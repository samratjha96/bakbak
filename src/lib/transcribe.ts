import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommandInput,
  TranscriptionJobStatus,
} from "@aws-sdk/client-transcribe";
import { transcribeClient } from "./transcribe-client";
import { getAWSLanguageCode, languages } from "~/lib/languages";
import { validateAwsConfig } from "./aws-config";
import { s3 } from "./s3";

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

  // AWS Transcribe auto-detects media format - no detection needed

  /**
   * Start a transcription job
   */
  async startTranscription(
    recordingId: string,
    audioUrl: string,
    languageCode: string = "en-US",
  ): Promise<string> {
    const transcribeLanguageCode = languageCode.includes("-") 
      ? languageCode 
      : getAWSLanguageCode(languageCode, "transcribe") || "en-US";

    const timestamp = new Date().getTime();
    const jobName = `transcription-${recordingId}-${timestamp}`;

    if (!process.env.AWS_S3_BUCKET) {
      throw new Error("AWS_S3_BUCKET not set");
    }

    try {
      await this.client.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          LanguageCode: transcribeLanguageCode as any,
          Media: { MediaFileUri: audioUrl },
          OutputBucketName: process.env.AWS_S3_BUCKET,
        }),
      );

      return jobName;
    } catch (error: any) {
      // Simplify error handling to pass through essential information
      const message =
        error.$metadata?.httpStatusCode === 403
          ? "AWS permission denied"
          : error.message || "Unknown error";

      throw new Error(`Failed to start transcription job: ${message}`);
    }
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
    } catch (error: any) {

      // Handle common error types
      if (error.name === "ResourceNotFoundException") {
        return {
          status: "NOT_FOUND",
          errorMessage: "Job not found",
        };
      }

      if (error.name === "BadRequestException") {
        return {
          status: "ERROR",
          errorMessage: "Invalid request",
        };
      }

      return {
        status: "ERROR",
        errorMessage: error.message || "Unknown error",
      };
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
      throw new Error(`Transcription not ready: ${statusResponse.status}`);
    }

    try {
      const response = await this.client.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: jobId,
        }),
      );

      const job = response.TranscriptionJob;
      if (!job?.Transcript?.TranscriptFileUri) {
        console.error(`No transcript file URI for job ${jobId}`);
        throw new Error("No transcript file available");
      }

      const transcriptUrl = new URL(job.Transcript.TranscriptFileUri);
      const pathParts = transcriptUrl.pathname.substring(1).split("/");
      const transcriptKey = pathParts.slice(1).join("/");

      const transcriptBuffer = await s3.download(transcriptKey);
      const transcriptData = JSON.parse(transcriptBuffer.toString("utf-8"));
      const text = transcriptData.results?.transcripts?.[0]?.transcript || "";

      return {
        text,
        items: transcriptData.results?.items?.map((item: any) => ({
          text: item.alternatives?.[0]?.content || "",
          startTime: parseFloat(item.start_time || "0"),
          endTime: parseFloat(item.end_time || "0"),
          confidence: parseFloat(item.alternatives?.[0]?.confidence || "0"),
        })),
      };
    } catch (error: any) {
      throw new Error(`Transcription result error: ${error.message}`);
    }
  }
}

// Export a singleton instance of the transcribe service
export const transcribe = new Transcribe();

// AWS_S3_BUCKET required - will throw clear errors if missing
