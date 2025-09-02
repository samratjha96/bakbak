import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "~/lib/clients";
import { createServerFn } from "@tanstack/react-start";

// Get default bucket from environment variable
const defaultBucket = process.env.AWS_S3_BUCKET || "";

/**
 * Generate a presigned URL for uploading a file (PUT)
 */
export const getPresignedUploadUrl = createServerFn()
  .validator(
    (data: {
      bucket?: string;
      key: string;
      contentType: string;
      expiresIn?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const bucket = data.bucket || defaultBucket;
    const expiresIn = data.expiresIn || 3600;

    if (!bucket) {
      throw new Error(
        "S3 bucket not configured. Please set AWS_S3_BUCKET environment variable.",
      );
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: data.key,
        ContentType: data.contentType,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error(`[S3] Failed to generate presigned URL:`, error);
      throw error;
    }
  });

/**
 * Get a regular S3 URL (not signed)
 */
export const getS3Url = createServerFn()
  .validator((data: { bucket?: string; key: string }) => data)
  .handler(async ({ data }) => {
    const bucket = data.bucket || defaultBucket;
    const region = process.env.AWS_REGION || "us-east-1";

    if (!bucket) {
      throw new Error(
        "S3 bucket not configured. Please set AWS_S3_BUCKET environment variable.",
      );
    }

    return `https://s3.${region}.amazonaws.com/${bucket}/${data.key}`;
  });

/**
 * Initiate a multipart upload
 */
export const initiateMultipartUpload = createServerFn()
  .validator(
    (data: { bucket?: string; key: string; contentType?: string }) => data,
  )
  .handler(async ({ data }) => {
    const bucket = data.bucket || defaultBucket;

    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: data.key,
        ContentType: data.contentType,
      });

      const response = await s3Client.send(command);
      if (!response.UploadId) {
        throw new Error(
          "Failed to initiate multipart upload - no UploadId returned",
        );
      }
      return {
        uploadId: response.UploadId,
        key: data.key,
      };
    } catch (error) {
      console.error(
        `Error initiating multipart upload for ${data.key}:`,
        error,
      );
      throw error;
    }
  });

/**
 * Generate a presigned URL for uploading a part
 */
export const getPresignedPartUploadUrl = createServerFn()
  .validator(
    (data: {
      bucket?: string;
      key: string;
      uploadId: string;
      partNumber: number;
      expiresIn?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const bucket = data.bucket || defaultBucket;
    const expiresIn = data.expiresIn || 3600;

    try {
      const command = new UploadPartCommand({
        Bucket: bucket,
        Key: data.key,
        UploadId: data.uploadId,
        PartNumber: data.partNumber,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error(
        `Error generating presigned URL for part ${data.partNumber}:`,
        error,
      );
      throw error;
    }
  });

/**
 * Complete a multipart upload
 */
export const completeMultipartUpload = createServerFn()
  .validator(
    (data: {
      bucket?: string;
      key: string;
      uploadId: string;
      parts: CompletedPart[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const bucket = data.bucket || defaultBucket;

    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: data.key,
        UploadId: data.uploadId,
        MultipartUpload: {
          Parts: data.parts,
        },
      });

      await s3Client.send(command);
      return {
        success: true,
        location: `https://s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${bucket}/${data.key}`,
      };
    } catch (error) {
      console.error(
        `Error completing multipart upload for ${data.key}:`,
        error,
      );
      throw error;
    }
  });

/**
 * Abort a multipart upload
 */
export const abortMultipartUpload = createServerFn()
  .validator((data: { bucket?: string; key: string; uploadId: string }) => data)
  .handler(async ({ data }) => {
    const bucket = data.bucket || defaultBucket;

    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: data.key,
        UploadId: data.uploadId,
      });

      await s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error(`Error aborting multipart upload for ${data.key}:`, error);
      throw error;
    }
  });
