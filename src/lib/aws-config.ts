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

/**
 * Gets the S3 bucket name from environment variable
 *
 * REQUIRED: AWS_S3_BUCKET environment variable must be set
 * This bucket will be used to store all recordings organized by:
 * recordings/userid/todaysdate/recording_uuid
 *
 * @returns The S3 bucket name
 * @throws Error if bucket name is not configured
 */
export function getS3BucketName(): string {
  const bucketName = process.env.AWS_S3_BUCKET;

  if (!bucketName) {
    throw new Error(
      "AWS_S3_BUCKET environment variable is required and must be set. " +
        "This application does not provide fallback bucket names for security reasons.",
    );
  }

  return bucketName;
}

/**
 * Generates an S3 URL for a given key
 * @param key The S3 object key
 * @param bucket Optional bucket name (defaults to configured bucket)
 * @returns The complete S3 URL
 */
export function getS3Url(key: string, bucket?: string): string {
  const bucketName = bucket || getS3BucketName();
  return `https://${bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
}

/**
 * Validates that all required AWS configuration is present
 * @returns Object with validation results
 */
export function validateAwsConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.AWS_S3_BUCKET) {
    errors.push("AWS_S3_BUCKET environment variable is required");
  }

  if (!process.env.AWS_REGION) {
    warnings.push("AWS_REGION not set, using default: us-east-1");
  }

  // Require explicit AWS credentials configuration
  if (
    !process.env.AWS_ACCESS_KEY_ID &&
    !process.env.AWS_PROFILE &&
    !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI &&
    !process.env.AWS_WEB_IDENTITY_TOKEN_FILE
  ) {
    errors.push(
      "No AWS credentials configured. You must set one of: " +
        "AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, AWS_PROFILE, " +
        "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI, or AWS_WEB_IDENTITY_TOKEN_FILE",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
