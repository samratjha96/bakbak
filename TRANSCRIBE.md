# AWS Transcribe Integration

This document provides information about the AWS Transcribe integration in the BakBak application. This integration has been streamlined following John Carmack's code cleanup principles.

## Overview

The application uses AWS Transcribe service to generate transcriptions of audio recordings. The integration uses real AWS Transcribe service to provide accurate transcription results.

## Architecture

### Core Components

1. **AWS Client Configuration**
   - Located in `src/lib/transcribe-client.ts`
   - Uses AWS SDK v3 with built-in retry mechanism
   - Configured with reasonable timeouts and 3 max retry attempts

2. **Transcribe Service**
   - Located in `src/lib/transcribe.ts`
   - Provides core methods: `startTranscription`, `getTranscriptionStatus`, `getTranscriptionResult`
   - Handles media format detection and AWS language code conversion

3. **Server Functions**
   - Located in `src/server/transcribe-jobs.ts`
   - Exposes two main endpoints:
     - `startTranscriptionJob`: Initiates transcription for a recording
     - `getTranscriptionJobStatus`: Checks job status and retrieves results

4. **UI Components**
   - `TranscribeButton.tsx`: Button to initiate transcription
   - `TranscriptionDisplay.tsx`: Component to view and edit transcription results
   - `TranscriptionStatus.tsx`: Shows current status of transcription

## Configuration

### Environment Variables

The following environment variables are used to configure the transcription service:

```bash
# AWS Configuration
AWS_REGION=us-east-1  # The AWS region to use
AWS_S3_BUCKET=your-bucket-name  # The S3 bucket to store transcriptions
AWS_ACCESS_KEY_ID=your-access-key  # AWS credentials (only needed in production)
AWS_SECRET_ACCESS_KEY=your-secret-key  # AWS credentials (only needed in production)

# AWS Configuration
AWS_REGION=us-east-1  # The AWS region to use
AWS_S3_BUCKET=your-bucket-name  # The S3 bucket to store transcriptions
AWS_ACCESS_KEY_ID=your-access-key  # AWS credentials
AWS_SECRET_ACCESS_KEY=your-secret-key  # AWS credentials
```

## Implementation Notes

### Data Flow

1. User clicks "Transcribe" button
2. Button calls server function `startTranscriptionJob`
3. Server function:
   - Fetches recording details
   - Updates status to IN_PROGRESS in database
   - Gets presigned URL for audio file
   - Calls AWS Transcribe service to start job
   - Returns job ID
4. UI starts polling for updates (using React Query's built-in polling)
5. When job completes, transcription text is stored in database
6. TranscriptionDisplay component shows the result

### Error Handling

The implementation includes proper error handling at multiple levels:

- AWS SDK errors are properly caught and transformed
- HTTP 403 errors are specifically identified as permission issues
- Database errors are handled appropriately
- All errors are propagated with meaningful messages

### Polling Implementation

Instead of custom polling logic, we use React Query's built-in polling capabilities:

```typescript
useQuery({
  queryKey: ["transcription", recordingId],
  // ... other options
  refetchInterval: (data) =>
    data?.transcriptionStatus === "IN_PROGRESS" ? 5000 : false,
  refetchIntervalInBackground: true,
});
```

This approach reduces code complexity while providing robust polling behavior.

## Required AWS Permissions

For the integration to work properly, you need the following AWS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

## Troubleshooting

If the transcription feature isn't working:

1. Check the browser console for any errors
2. Verify the environment variables are set correctly
3. Check that AWS credentials have the required permissions
4. Verify that the S3 bucket exists and is accessible
5. Check that the audio file is properly uploaded and accessible
6. Inspect the network tab in your browser's developer tools to see if API requests are failing
7. Verify that the `transcribe-client.ts` is correctly configured with your AWS region

## Language Support

The application supports multiple languages by:

1. Converting UI language codes to AWS Transcribe language codes
2. Supporting multi-language transcription for all supported AWS Transcribe languages
3. Storing language preference with each recording

See `src/lib/languages.ts` for the mapping between UI language codes and AWS service language codes.