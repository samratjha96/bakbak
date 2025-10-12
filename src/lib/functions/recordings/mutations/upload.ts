/**
 * ABOUTME: Recording file upload server functions
 * ABOUTME: Handles audio file uploads to S3 with storage path generation
 */
import { createServerFn } from "@tanstack/react-start";
import { getPresignedUploadUrl, getS3Url } from "~/lib/functions/s3/uploads/single";
import { RecordingStoragePaths } from "~/services/storage/RecordingStoragePaths";

/**
 * Server function for uploading audio recordings to S3
 * Extracted from routes/new.tsx for better organization
 */
export const uploadAudioRecording = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Invalid form data");
    }

    const audioFile = data.get("audioFile") as File;
    const userId = data.get("userId") as string;
    const fileExtension = (data.get("fileExtension") as string) || "webm";
    const contentType =
      (data.get("contentType") as string) || `audio/${fileExtension}`;

    if (!userId) {
      throw new Error("User ID is required for recording upload");
    }

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("Valid audio file is required for upload");
    }

    return { audioFile, userId, fileExtension, contentType };
  })
  .handler(
    async ({ data: { audioFile, userId, fileExtension, contentType } }) => {
      try {
        const audioBlob = new Blob([await audioFile.arrayBuffer()], {
          type: contentType || `audio/${fileExtension}`,
        });

        const storagePath = RecordingStoragePaths.getAudioPath(
          userId,
          fileExtension,
        );

        const recordingUUID =
          RecordingStoragePaths.extractRecordingUUID(storagePath);

        if (!recordingUUID) {
          throw new Error(
            "Failed to generate recording UUID - check system requirements",
          );
        }

        const presignedUrl = await getPresignedUploadUrl({
          data: {
            key: storagePath,
            contentType: contentType || `audio/${fileExtension}`,
          },
        });

        const response = await fetch(presignedUrl, {
          method: "PUT",
          body: audioBlob,
          headers: {
            "Content-Type": contentType || `audio/${fileExtension}`,
          },
        });

        if (!response.ok) {
          const responseText = await response.text();
          console.error(
            `Upload failed: ${response.status} ${response.statusText}`,
            responseText,
          );
          throw new Error(
            `S3 upload failed with status ${response.status}: ${response.statusText}. Response: ${responseText}`,
          );
        }

        const fileUrl = await getS3Url({ data: { key: storagePath } });

        return {
          url: fileUrl,
          recordingUUID,
          storagePath,
          userId,
        };
      } catch (error) {
        console.error(`Upload failed:`, error);
        throw error;
      }
    },
  );