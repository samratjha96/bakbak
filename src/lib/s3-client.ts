import { S3Client } from "@aws-sdk/client-s3";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { AWS_CONFIG } from "./aws-config";

// Create a simple S3Client instance
export const s3Client = new S3Client({
  region: AWS_CONFIG.region,
  credentials: defaultProvider(),
  requestHandler: new NodeHttpHandler({
    connectionTimeout: AWS_CONFIG.timeouts.connectionTimeout,
    socketTimeout: AWS_CONFIG.timeouts.socketTimeout,
  }),
});
