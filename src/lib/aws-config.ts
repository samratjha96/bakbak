export const AWS_CONFIG = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {},
  retryConfig: {
    maxAttempts: 5,
    retryMode: "standard",
  },
  timeouts: {
    connectionTimeout: 10000, // Increased from 5000
    socketTimeout: 60000, // Increased from 30000
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
    errors.push(
      "AWS_S3_BUCKET environment variable is required for transcription output",
    );
  }

  if (!process.env.AWS_REGION) {
    warnings.push("AWS_REGION not set, using default: us-east-1");
  }

  // Check Transcribe-specific permission requirements
  if (!process.env.AWS_S3_BUCKET) {
    errors.push(
      "AWS Transcribe requires an S3 bucket for output. Set AWS_S3_BUCKET environment variable.",
    );
  } else {
    // If bucket exists, check if it follows naming requirements
    const bucketName = process.env.AWS_S3_BUCKET;
    if (bucketName.includes("_") || bucketName.includes(".")) {
      errors.push(
        `S3 bucket name '${bucketName}' contains underscores or dots, which may cause issues with Transcribe output location.`,
      );
    }

    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucketName)) {
      warnings.push(
        `S3 bucket name '${bucketName}' may not conform to AWS bucket naming rules.`,
      );
    }
  }

  // Require explicit AWS credentials configuration
  if (
    !process.env.AWS_ACCESS_KEY_ID &&
    !process.env.AWS_SECRET_ACCESS_KEY &&
    !process.env.AWS_PROFILE &&
    !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI &&
    !process.env.AWS_WEB_IDENTITY_TOKEN_FILE
  ) {
    errors.push(
      "No AWS credentials configured. You must set one of: " +
        "AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, AWS_PROFILE, " +
        "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI, or AWS_WEB_IDENTITY_TOKEN_FILE",
    );
  } else {
    // Check for common credential issues
    if (process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
      errors.push(
        "AWS_ACCESS_KEY_ID is set but AWS_SECRET_ACCESS_KEY is missing",
      );
    }

    if (!process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      errors.push(
        "AWS_SECRET_ACCESS_KEY is set but AWS_ACCESS_KEY_ID is missing",
      );
    }
  }

  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
  };

  // Log validation results
  if (!result.isValid) {
    console.error("AWS Configuration validation failed:", result.errors);
  }

  if (result.warnings.length > 0) {
    console.warn("AWS Configuration warnings:", result.warnings);
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log("AWS Configuration valid");
  }

  return result;
}
