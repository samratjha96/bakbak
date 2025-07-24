import { S3Client } from "@aws-sdk/client-s3";

// Create an S3 client instance that will use default credentials and region
// This client will be reused throughout the application
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// We don't need to explicitly set credentials as they will be loaded
// automatically from the environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)