import { S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

// Create an S3 client instance that uses the credential provider chain
// This explicitly uses the shared credentials file (~/.aws/credentials)
// with the default profile, which is often more reliable in local development

// Get region from environment or default to us-east-1
const region = process.env.AWS_REGION || "us-east-1";

export const s3Client = new S3Client({
  region,
  credentials: fromIni({
    // Use default profile unless specified otherwise
    profile: process.env.AWS_PROFILE || "default",
  }),
  requestHandler: new NodeHttpHandler({
    // Increase timeout for better stability with large files
    connectionTimeout: 5000,
    socketTimeout: 30000
  }),
  // Force path-style addressing is essential to avoid redirects with certain bucket names
  forcePathStyle: true,
  // Set the endpoint based on the region dynamically
  endpoint: `https://s3.${region}.amazonaws.com`
});
