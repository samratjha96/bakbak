import { 
  ListBucketsCommand, 
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListBucketsCommandOutput,
  ListObjectsV2CommandOutput,
  GetObjectCommandOutput,
  S3ServiceException
} from "@aws-sdk/client-s3";
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
        Prefix: prefix
      });
      return await s3Client.send(command);
    } catch (error) {
      console.error(`Error listing objects in bucket ${this.bucketName}:`, error);
      throw error;
    }
  }
  
  /**
   * Upload a file to S3 bucket
   */
  async uploadFile(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType
      });
      
      await s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error(`Error uploading file ${key} to bucket ${this.bucketName}:`, error);
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
        Key: key
      });
      
      return await s3Client.send(command);
    } catch (error) {
      console.error(`Error downloading file ${key} from bucket ${this.bucketName}:`, error);
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
        Key: key
      });
      
      await s3Client.send(command);
    } catch (error) {
      console.error(`Error deleting file ${key} from bucket ${this.bucketName}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a signed URL for temporary access to a file
   */
  getFileUrl(key: string): string {
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }
}