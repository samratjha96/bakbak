import {
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListBucketsCommandOutput,
  ListObjectsV2CommandOutput,
  GetObjectCommandOutput,
  S3ServiceException,
  CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3-client";

/**
 * Service class for S3 operations using AWS SDK v3
 */
export class S3Service {
  private bucketName: string;

  constructor(bucketName?: string) {
    // Use environment variable if bucket name not provided
    this.bucketName = bucketName || process.env.AWS_S3_BUCKET || "";
  }

  /**
   * List all available S3 buckets
   */
  async listBuckets(): Promise<ListBucketsCommandOutput> {
    try {
      const command = new ListBucketsCommand({});
      return await s3Client.send(command);
    } catch (error) {
      console.error("Error listing buckets:", error);
      throw error;
    }
  }

  /**
   * List objects in the S3 bucket with optional prefix filter
   */
  async listObjects(prefix?: string): Promise<ListObjectsV2CommandOutput> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });
      return await s3Client.send(command);
    } catch (error) {
      console.error(
        `Error listing objects in bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Upload a file to S3 bucket
   */
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error(
        `Error uploading file ${key} to bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Initialize a multipart upload for large files
   * @param key The S3 object key
   * @param contentType The file content type
   */
  async initiateMultipartUpload(
    key: string,
    contentType?: string,
  ): Promise<string> {
    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const response = await s3Client.send(command);
      if (!response.UploadId) {
        throw new Error(
          "Failed to initiate multipart upload - no UploadId returned",
        );
      }
      return response.UploadId;
    } catch (error) {
      console.error(`Error initiating multipart upload for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Upload a part of a multipart upload
   * @param key The S3 object key
   * @param uploadId The upload ID from initiateMultipartUpload
   * @param partNumber The part number (1-10000)
   * @param body The part data
   */
  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<{ ETag: string; PartNumber: number }> {
    try {
      const command = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      });

      const response = await s3Client.send(command);
      if (!response.ETag) {
        throw new Error(
          `Failed to upload part ${partNumber} - no ETag returned`,
        );
      }

      return {
        ETag: response.ETag,
        PartNumber: partNumber,
      };
    } catch (error) {
      console.error(`Error uploading part ${partNumber} for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Complete a multipart upload
   * @param key The S3 object key
   * @param uploadId The upload ID from initiateMultipartUpload
   * @param parts Array of completed parts with ETag and PartNumber
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<string> {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      });

      await s3Client.send(command);
      return this.getFileUrl(key);
    } catch (error) {
      console.error(`Error completing multipart upload for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Abort a multipart upload
   * @param key The S3 object key
   * @param uploadId The upload ID from initiateMultipartUpload
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error(`Error aborting multipart upload for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Download a file from S3 bucket
   */
  async downloadFile(key: string): Promise<GetObjectCommandOutput> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await s3Client.send(command);
    } catch (error) {
      console.error(
        `Error downloading file ${key} from bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a file from S3 bucket
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error(
        `Error deleting file ${key} from bucket ${this.bucketName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a presigned URL for downloading a file (GET)
   * @param key The S3 object key
   * @param expiresIn Time in seconds until the URL expires (default: 3600s = 1h)
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error(
        `Error generating presigned download URL for ${key}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a presigned URL for uploading a file (PUT)
   * @param key The S3 object key
   * @param contentType The file content type
   * @param expiresIn Time in seconds until the URL expires (default: 3600s = 1h)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error(`Error generating presigned upload URL for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a regular S3 URL (not signed)
   */
  getFileUrl(key: string): string {
    // Get region from environment or default to us-east-1
    const region = process.env.AWS_REGION || "us-east-1";
    // Use path-style URL format to match our client configuration
    return `https://s3.${region}.amazonaws.com/${this.bucketName}/${key}`;
  }
}
