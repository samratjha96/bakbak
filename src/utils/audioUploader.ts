import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getS3Url,
} from "~/server/s3";

/**
 * Uploads an audio recording to S3
 * @param audioBlob The audio blob to upload
 * @param language The language code (used for file naming)
 * @returns The URL of the uploaded file
 */
export async function uploadAudioRecording(
  audioBlob: Blob,
  language: string,
): Promise<string> {
  try {
    // Generate a unique key for the file
    const timestamp = Date.now();
    const key = `recordings/${language}/${timestamp}.webm`;

    // Get a presigned URL from the server function
    const presignedUrl = await getPresignedUploadUrl({
      data: {
        key,
        contentType: "audio/webm",
      },
    });

    // Use fetch to upload the file directly from the browser
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: audioBlob,
      headers: {
        "Content-Type": "audio/webm",
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    // Get the public URL for the uploaded file
    const fileUrl = await getS3Url({ data: { key } });
    return fileUrl;
  } catch (error) {
    console.error("Error uploading audio recording:", error);
    throw new Error(
      `Failed to upload audio recording: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get a signed URL for the audio file to allow playback
 * @param audioUrl The S3 URL of the audio file
 * @returns A signed URL for playback
 */
export async function getAudioPlaybackUrl(audioUrl: string): Promise<string> {
  try {
    // Extract the key from the URL
    const urlParts = audioUrl.split("/");
    const key = urlParts.slice(3).join("/");

    // Generate a presigned URL valid for 1 hour using the server function
    const signedUrl = await getPresignedDownloadUrl({
      data: {
        key,
        expiresIn: 3600,
      },
    });

    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    // Return the original URL as a fallback
    return audioUrl;
  }
}
