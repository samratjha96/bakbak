import { S3Client } from "@aws-sdk/client-s3";
import { TranscribeClient } from "@aws-sdk/client-transcribe";
import { TranslateClient } from "@aws-sdk/client-translate";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { AWS_CONFIG } from "./aws-config";

export const s3Client = new S3Client({
  region: AWS_CONFIG.region,
  credentials: defaultProvider(),
  requestHandler: new NodeHttpHandler({
    connectionTimeout: AWS_CONFIG.timeouts.connectionTimeout,
    socketTimeout: AWS_CONFIG.timeouts.socketTimeout,
  }),
});

export const transcribeClient = new TranscribeClient({
  region: AWS_CONFIG.region,
  credentials: defaultProvider(),
  requestHandler: new NodeHttpHandler({
    connectionTimeout: AWS_CONFIG.timeouts.connectionTimeout,
    socketTimeout: AWS_CONFIG.timeouts.socketTimeout,
  }),
  maxAttempts: 3,
});

export const translateClient = new TranslateClient({
  region: AWS_CONFIG.region,
  credentials: defaultProvider(),
  requestHandler: new NodeHttpHandler({
    connectionTimeout: AWS_CONFIG.timeouts.connectionTimeout,
    socketTimeout: 15000,
  }),
});


