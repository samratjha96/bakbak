/**
 * ABOUTME: S3 single file upload operations using presigned URLs
 * ABOUTME: Handles direct upload URLs and S3 URL generation
 */
import {
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "~/lib/clients";
import { createServerFn } from "@tanstack/react-start";

const defaultBucket = process.env.AWS_S3_BUCKET || "";

/**
 * Generate a presigned URL for uploading a file (PUT)
 */
export const getPresignedUploadUrl = createServerFn()
  .inputValidator(
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
  .inputValidator((data: { bucket?: string; key: string }) => data)
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