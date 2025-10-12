/**
 * ABOUTME: S3 multipart upload operations for large files
 * ABOUTME: Handles initiate, part upload URLs, complete, and abort operations
 */
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "~/lib/clients";
import { createServerFn } from "@tanstack/react-start";

const defaultBucket = process.env.AWS_S3_BUCKET || "";

/**
 * Initiate a multipart upload
 */
export const initiateMultipartUpload = createServerFn()
  .inputValidator(
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
  .inputValidator(
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
  .inputValidator(
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
  .inputValidator((data: { bucket?: string; key: string; uploadId: string }) => data)
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