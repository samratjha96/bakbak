import { TranscribeClient } from "@aws-sdk/client-transcribe";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { AWS_CONFIG } from "./aws-config";
import { Logger } from "@aws-sdk/types";

// Create a TranscribeClient instance using the central AWS configuration
export const transcribeClient = new TranscribeClient({
  region: AWS_CONFIG.region,
  credentials: defaultProvider(), // This will automatically use the best available credentials
  requestHandler: new NodeHttpHandler({
    connectionTimeout: AWS_CONFIG.timeouts.connectionTimeout,
    socketTimeout: AWS_CONFIG.timeouts.socketTimeout,
  }),
  // Use built-in AWS retry strategy with reasonable defaults
  maxAttempts: 3,
});
