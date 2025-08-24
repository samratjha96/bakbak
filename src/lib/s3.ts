import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CompletedPart,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./clients";
import { AWS_CONFIG, getS3BucketName } from "./aws-config";

/**
 * Simple, focused S3 service - no unnecessary abstractions.
 * Combines file operations, multipart uploads, and JSON convenience methods.
 */
export class S3 {
  private bucket: string;
  private region: string;

  constructor(bucket?: string) {
    this.bucket = bucket || getS3BucketName();
    this.region = AWS_CONFIG.region;

    if (!this.bucket) {
      throw new Error(
        "S3 bucket name required. Set AWS_S3_BUCKET environment variable.",
      );
    }
  }

  // Basic file operations
  async upload(
    key: string,
    data: File | Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<string> {
    let body: Buffer | Uint8Array;
    let type = contentType;

    if (data instanceof File) {
      type = type || data.type;
      body = Buffer.from(await data.arrayBuffer());
    } else if (typeof data === "string") {
      body = Buffer.from(data, "utf-8");
      type = type || "text/plain";
    } else {
      body = data;
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: type,
      }),
    );

    return this.getUrl(key);
  }

  async download(key: string): Promise<Buffer> {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Empty response for ${key}`);
    }

    // Handle different stream types efficiently
    const stream = response.Body as any;

    if (typeof stream.transformToByteArray === "function") {
      const bytes = await stream.transformToByteArray();
      return Buffer.from(bytes);
    }

    if (typeof stream.getReader === "function") {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.length > 0) {
          chunks.push(value);
          totalLength += value.length;
        }
      }

      const result = Buffer.allocUnsafe(totalLength);
      let position = 0;
      for (const chunk of chunks) {
        result.set(chunk, position);
        position += chunk.length;
      }
      return result;
    }

    throw new Error("Unsupported stream type");
  }

  async delete(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    return (
      response.Contents?.map((item) => item.Key || "").filter(Boolean) || []
    );
  }

  // JSON convenience methods
  async uploadJSON<T>(key: string, data: T): Promise<string> {
    const json = JSON.stringify(data);
    return this.upload(key, json, "application/json");
  }

  async downloadJSON<T>(key: string): Promise<T> {
    const buffer = await this.download(key);
    return JSON.parse(buffer.toString("utf-8"));
  }

  // Multipart uploads for large files
  async createMultipartUpload(
    key: string,
    contentType?: string,
  ): Promise<string> {
    const response = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    );

    if (!response.UploadId) {
      throw new Error("Failed to create multipart upload");
    }

    return response.UploadId;
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    data: Buffer | Uint8Array,
  ): Promise<{ ETag: string; PartNumber: number }> {
    const response = await s3Client.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: data,
      }),
    );

    if (!response.ETag) {
      throw new Error(`Failed to upload part ${partNumber}`);
    }

    return {
      ETag: response.ETag,
      PartNumber: partNumber,
    };
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<string> {
    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    );

    return this.getUrl(key);
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  // Signed URLs
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Get content type based on file extension
    const contentType = this.getContentTypeFromKey(key);

    // Create S3 command with minimal required settings
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: contentType,
      ResponseContentDisposition: "inline",
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  private getContentTypeFromKey(key: string): string | undefined {
    const extension = key.split(".").pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      webm: "audio/webm",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      aac: "audio/aac",
      flac: "audio/flac",
    };

    return extension ? mimeTypes[extension] : undefined;
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    return getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  // Direct URLs
  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

// Default instance using environment config
export const s3 = new S3();
