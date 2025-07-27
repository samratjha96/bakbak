export const AWS_CONFIG = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {},
  retryConfig: {
    maxAttempts: 3,
    retryMode: "standard",
  },
  timeouts: {
    connectionTimeout: 5000,
    socketTimeout: 30000,
  },
};

export function getAwsConfig(serviceSpecificConfig = {}) {
  return {
    region: AWS_CONFIG.region,
    ...serviceSpecificConfig,
  };
}

export function getS3BucketName() {
  return process.env.S3_BUCKET_NAME || "bakbak-recordings";
}

export function getS3Url(key: string, bucket?: string) {
  const bucketName = bucket || getS3BucketName();
  return `https://${bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
}
