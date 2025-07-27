import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  DeleteTranscriptionJobCommand,
  StartTranscriptionJobCommandInput,
  GetTranscriptionJobCommandOutput,
  TranscriptionJobStatus,
  Media,
  LanguageCode,
  MediaFormat,
} from "@aws-sdk/client-transcribe";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import {
  TranscriptionService,
  TranscriptionResult,
  TranscriptionItem,
} from "./TranscriptionService";
import { transcribeClient } from "~/lib/transcribe-client";

/**
 * Implementation of TranscriptionService using AWS Transcribe
 */
export class AWSTranscribeService implements TranscriptionService {
  private client: TranscribeClient;
  private region: string;

  /**
   * Creates a new AWSTranscribeService
   * @param client Optional TranscribeClient (uses default credentials if not provided)
   */
  constructor(client: TranscribeClient = transcribeClient) {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.client = client;
  }

  /**
   * Starts a new transcription job with AWS Transcribe
   * @param recordingId The ID of the recording being transcribed
   * @param audioUrl The URL of the audio file to transcribe (must be accessible by AWS Transcribe)
   * @param languageCode Optional ISO language code (defaults to 'en-US')
   * @returns A promise that resolves to the transcription job ID
   */
  async startTranscription(
    recordingId: string,
    audioUrl: string,
    languageCode: string = "en-US",
  ): Promise<string> {
    // Create a unique job name with timestamp to avoid conflicts
    const timestamp = new Date().getTime();
    const jobName = `transcription-${recordingId}-${timestamp}`;

    try {
      // Prepare media object
      const media: Media = {
        MediaFileUri: audioUrl,
      };

      // Configure the transcription job
      const input: StartTranscriptionJobCommandInput = {
        TranscriptionJobName: jobName,
        Media: media,
        MediaFormat: this.detectMediaFormat(audioUrl),
        LanguageCode: this.mapLanguageCode(languageCode),
        OutputBucketName: process.env.AWS_S3_BUCKET,
        OutputKey: `transcriptions/${recordingId}/${jobName}.json`,
        // Enable additional features
        Settings: {
          ShowSpeakerLabels: true,
          MaxSpeakerLabels: 10, // Default max number of speakers
          ShowAlternatives: true,
          MaxAlternatives: 2,
        },
      };

      // Start the transcription job
      const command = new StartTranscriptionJobCommand(input);
      const response = await this.client.send(command);

      // Return the job name which serves as the job ID
      return jobName;
    } catch (error) {
      console.error("Error starting AWS Transcribe job:", error);
      throw new Error(
        `Failed to start transcription job: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Gets the current status of a transcription job
   * @param jobId The ID of the transcription job (same as the job name)
   * @returns A promise that resolves to the job status and optional error message
   */
  async getTranscriptionStatus(
    jobId: string,
  ): Promise<{ status: string; errorMessage?: string }> {
    try {
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobId,
      });

      const response = await this.client.send(command);
      const job = response.TranscriptionJob;

      if (!job) {
        throw new Error("Transcription job not found");
      }

      return {
        status: job.TranscriptionJobStatus || "UNKNOWN",
        errorMessage: job.FailureReason,
      };
    } catch (error) {
      console.error("Error getting AWS Transcribe job status:", error);
      throw new Error(
        `Failed to get transcription status: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Gets the result of a completed transcription job
   * @param jobId The ID of the completed transcription job
   * @returns A promise that resolves to the transcription result
   */
  async getTranscriptionResult(jobId: string): Promise<TranscriptionResult> {
    try {
      // First check if the job is completed
      const statusResponse = await this.getTranscriptionStatus(jobId);

      if (statusResponse.status !== TranscriptionJobStatus.COMPLETED) {
        throw new Error(
          `Cannot get results for job with status: ${statusResponse.status}`,
        );
      }

      // Get the job details to find the transcript URI
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobId,
      });

      const response = await this.client.send(command);
      const job = response.TranscriptionJob;

      if (!job || !job.Transcript || !job.Transcript.TranscriptFileUri) {
        throw new Error("Transcription result not available");
      }

      // Fetch the transcript JSON from the provided URI
      const transcriptUri = job.Transcript.TranscriptFileUri;
      const transcriptResponse = await fetch(transcriptUri);

      if (!transcriptResponse.ok) {
        throw new Error(
          `Failed to fetch transcript: ${transcriptResponse.statusText}`,
        );
      }

      // Parse the AWS Transcribe format into our simplified format
      const awsTranscript = await transcriptResponse.json();
      return this.parseAwsTranscriptResult(awsTranscript);
    } catch (error) {
      console.error("Error getting AWS Transcribe job result:", error);
      throw new Error(
        `Failed to get transcription result: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Cancels an in-progress transcription job
   * @param jobId The ID of the transcription job to cancel
   * @returns A promise that resolves when the job is cancelled
   */
  async cancelTranscription(jobId: string): Promise<void> {
    try {
      const command = new DeleteTranscriptionJobCommand({
        TranscriptionJobName: jobId,
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error cancelling AWS Transcribe job:", error);
      throw new Error(
        `Failed to cancel transcription job: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Parses the AWS Transcribe result JSON into our application format
   * @param awsTranscript The AWS Transcribe result JSON
   * @returns A TranscriptionResult object
   */
  private parseAwsTranscriptResult(awsTranscript: any): TranscriptionResult {
    // Type definitions are now defined at the class level for better scope
    type AWSTranscriptResult = {
      results: {
        transcripts: { transcript: string }[];
        items?: {
          start_time?: string;
          end_time?: string;
          alternatives: {
            confidence?: string;
            content: string;
          }[];
          type: "pronunciation" | "punctuation";
        }[];
        speaker_labels?: {
          speakers: number;
          segments: {
            speaker_label: string;
            items: {
              start_time: string;
              speaker_label: string;
            }[];
          }[];
        };
        language_code?: string;
      };
      status?: string;
    };

    // Type assertion to ensure proper typing
    const typedTranscript = awsTranscript as AWSTranscriptResult;
    try {
      const result: TranscriptionResult = {
        transcript: typedTranscript.results.transcripts[0].transcript,
        languageCode: typedTranscript.results.language_code || "en-US",
        items: [],
        alternatives: typedTranscript.results.transcripts
          .slice(1)
          .map((alt) => ({
            transcript: alt.transcript,
            confidence: 0, // AWS doesn't provide confidence scores for alternative transcripts
          })),
      };

      // Parse the items (segments) with timing information
      const items = typedTranscript.results.items || [];
      let currentSpeaker = "";

      // Process speaker labels if available
      const speakerLabels = typedTranscript.results.speaker_labels;
      const speakerMap = new Map<string, string>();

      if (speakerLabels && speakerLabels.segments) {
        for (const segment of speakerLabels.segments) {
          for (const item of segment.items) {
            speakerMap.set(
              `${item.start_time}`,
              `Speaker ${item.speaker_label}`,
            );
          }
        }
      }

      // Process each transcription item
      for (const item of items) {
        // Skip items without timing info (usually punctuation)
        if (!item.start_time && item.type === "punctuation") {
          // Add punctuation to the previous item's content if it exists
          if (result.items.length > 0) {
            result.items[result.items.length - 1].content +=
              item.alternatives[0].content;
          }
          continue;
        }

        // Get speaker if available
        if (item.start_time && speakerMap.has(item.start_time)) {
          currentSpeaker = speakerMap.get(item.start_time) || "";
        }

        const transcriptionItem: TranscriptionItem = {
          content: item.alternatives[0].content,
          startTime: parseFloat(item.start_time || "0"),
          endTime: parseFloat(item.end_time || "0"),
          confidence: parseFloat(item.alternatives[0].confidence || "0"),
          type: item.type as "pronunciation" | "punctuation",
          ...(currentSpeaker ? { speaker: currentSpeaker } : {}),
        };

        result.items.push(transcriptionItem);
      }

      return result;
    } catch (error) {
      console.error("Error parsing AWS transcription result:", error);
      throw new Error("Failed to parse transcription result");
    }
  }

  /**
   * Detects the media format from the file URL
   */
  private detectMediaFormat(url: string): MediaFormat {
    const extension = url.split(".").pop()?.toLowerCase() as string;

    switch (extension) {
      case "mp3":
        return MediaFormat.MP3;
      case "mp4":
        return MediaFormat.MP4;
      case "wav":
        return MediaFormat.WAV;
      case "m4a":
        return MediaFormat.M4A;
      case "flac":
        return MediaFormat.FLAC;
      case "ogg":
        return MediaFormat.OGG;
      case "amr":
        return MediaFormat.AMR;
      case "webm":
        return MediaFormat.WEBM;
      default:
        return MediaFormat.MP3; // Default to mp3 if unknown
    }
  }

  /**
   * Maps application language codes to AWS Transcribe language codes
   * @param languageCode The language code (e.g., 'en-US', 'es-ES')
   * @returns The corresponding AWS Transcribe language code
   */
  private mapLanguageCode(languageCode: string): LanguageCode {
    // Strip any region suffix if not supported by AWS Transcribe
    const baseLanguage = languageCode.split("-")[0].toLowerCase();

    // Map to AWS Transcribe supported language codes
    switch (baseLanguage) {
      case "en":
        return LanguageCode.EN_US;
      case "es":
        return LanguageCode.ES_US;
      case "fr":
        return LanguageCode.FR_FR;
      case "de":
        return LanguageCode.DE_DE;
      case "it":
        return LanguageCode.IT_IT;
      case "ja":
        return LanguageCode.JA_JP;
      case "ko":
        return LanguageCode.KO_KR;
      case "pt":
        return LanguageCode.PT_BR;
      case "zh":
        return LanguageCode.ZH_CN;
      case "ar":
        return LanguageCode.AR_SA;
      case "hi":
        return LanguageCode.HI_IN;
      // Add more languages as needed
      default:
        return LanguageCode.EN_US; // Default to English US if not supported
    }
  }
}
