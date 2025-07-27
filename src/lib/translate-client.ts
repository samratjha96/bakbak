import { TranslateClient } from "@aws-sdk/client-translate";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { AWS_CONFIG } from "./aws-config";

// Create a TranslateClient instance using the central AWS configuration
export const translateClient = new TranslateClient({
  region: AWS_CONFIG.region,
  credentials: defaultProvider(), // This will automatically use the best available credentials
  requestHandler: new NodeHttpHandler({
    connectionTimeout: AWS_CONFIG.timeouts.connectionTimeout,
    // Use a slightly shorter socketTimeout for translation requests
    socketTimeout: 15000,
  }),
});
