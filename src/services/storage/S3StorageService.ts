import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageService } from "./StorageService";
import { s3Client } from "~/lib/s3-client";
import { AWS_CONFIG, getS3BucketName } from "~/lib/aws-config";

/**
 * Implementation of StorageService using AWS S3
 */
export class S3StorageService implements StorageService {
  private bucketName: string;
  private region: string;

  /**
   * Creates a new S3StorageService
   * @param bucketName The S3 bucket name to use (defaults to environment variable)
   * @param client Optional S3 client (uses the default from s3-client.ts if not provided)
   */
  constructor(
    bucketName?: string,
    private client: S3Client = s3Client,
  ) {
    // Use the centralized AWS config for bucket name and region
    this.bucketName = bucketName || getS3BucketName();
    this.region = AWS_CONFIG.region;

    if (!this.bucketName) {
      throw new Error(
        "S3 bucket name is required. Set S3_BUCKET_NAME environment variable or pass to constructor.",
      );
    }
  }

  /**
   * Uploads a file to S3
   * @param path The S3 object key
   * @param file The file content as File, Buffer or Uint8Array
   * @param metadata Optional metadata to store with the file
   * @returns A promise that resolves to the URL of the uploaded file
   */
  async uploadFile(
    path: string,
    file: File | Buffer | Uint8Array,
    metadata?: Record<string, string>,
  ): Promise<string> {
    let body: Buffer | Uint8Array;
    let contentType: string | undefined;

    // Convert File to Buffer if needed
    if (file instanceof File) {
      contentType = file.type;
      body = Buffer.from(await file.arrayBuffer());
    } else {
      body = file;
    }

    // Extract content type from metadata if provided
    if (metadata?.contentType) {
      contentType = metadata.contentType;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.client.send(command);
      return this.getFileUrl(path);
    } catch (error) {
      console.error(
        `Error uploading file ${path} to bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Downloads a file from S3
   * @param path The S3 object key
   * @returns A promise that resolves to the file content as a Buffer
   */
  async downloadFile(path: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`Empty response body for ${path}`);
      }

      // Convert the readable stream to a buffer efficiently with proper typing
      const streamToBuffer = async (
        stream: any, // Use any since AWS SDK types aren't matching exactly
      ): Promise<Buffer> => {
        // Check if we have Node.js ReadableStream with transformToByteArray
        if (typeof stream.transformToByteArray === "function") {
          try {
            const bytes = await stream.transformToByteArray();
            return Buffer.from(bytes);
          } catch (e) {
            // Fall back to manual reading if transformToByteArray fails
          }
        }

        // For browser ReadableStream or fallback
        if (typeof stream.getReader === "function") {
          const reader = stream.getReader();
          // Pre-allocate a reasonably sized buffer to avoid too many reallocations
          // Use a growing buffer approach for better performance
          let totalLength = 0;
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Only push non-empty chunks
            if (value && value.length > 0) {
              totalLength += value.length;
              chunks.push(value);
            }
          }

          // Allocate a single buffer of the exact size needed
          const result = Buffer.allocUnsafe(totalLength);
          let position = 0;

          // Copy chunks into the pre-allocated buffer
          for (const chunk of chunks) {
            result.set(chunk, position);
            position += chunk.length;
          }

          return result;
        }

        // Last resort fallback for other stream types
        throw new Error("Unsupported stream type");
      };

      return await streamToBuffer(response.Body);
    } catch (error) {
      console.error(
        `Error downloading file ${path} from bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deletes a file from S3
   * @param path The S3 object key
   * @returns A promise that resolves when the file is deleted
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.client.send(command);
    } catch (error) {
      console.error(
        `Error deleting file ${path} from bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Checks if a file exists in S3
   * @param path The S3 object key to check
   * @returns A promise that resolves to true if the file exists, false otherwise
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === "NotFound") {
        return false;
      }
      // Re-throw any other errors
      console.error(`Error checking if file ${path} exists:`, error);
      throw error;
    }
  }

  /**
   * Uploads JSON data to S3
   * @param path The S3 object key
   * @param data The data object to store
   * @param pretty Whether to pretty print the JSON (default: false)
   * @returns A promise that resolves to the URL of the uploaded file
   */
  async uploadJSON<T>(
    path: string,
    data: T,
    pretty: boolean = false,
  ): Promise<string> {
    // Only use pretty printing when requested to save bandwidth and storage
    const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    const buffer = Buffer.from(json, "utf-8");

    return this.uploadFile(path, buffer, {
      contentType: "application/json",
    });
  }

  /**
   * Downloads and parses JSON data from S3
   * @param path The S3 object key
   * @returns A promise that resolves to the parsed JSON data
   */
  async downloadJSON<T>(path: string): Promise<T> {
    const buffer = await this.downloadFile(path);
    const json = buffer.toString("utf-8");
    return JSON.parse(json) as T;
  }

  /**
   * Generates a signed URL for temporary access to an S3 object
   * @param path The S3 object key
   * @param expiresIn Expiration time in seconds
   * @returns A promise that resolves to the signed URL
   */
  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      console.error(`Error generating signed URL for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Lists files in S3 with the given prefix
   * @param prefix The prefix to filter files by
   * @returns A promise that resolves to an array of file paths
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((item) => item.Key || "").filter(Boolean);
    } catch (error) {
      console.error(`Error listing files with prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Gets a regular S3 URL (not signed)
   * @param key The S3 object key
   * @returns The S3 URL
   */
  private getFileUrl(key: string): string {
    // Use the centralized AWS config to generate the URL
    return `https://s3.${AWS_CONFIG.region}.amazonaws.com/${this.bucketName}/${key}`;
  }
}
