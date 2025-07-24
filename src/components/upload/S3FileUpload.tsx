import * as React from "react";
import { UploadIcon } from "~/components/ui/Icons";
import { useServerFn } from "@tanstack/react-start";
import {
  getPresignedUploadUrl,
  getS3Url,
  initiateMultipartUpload,
  getPresignedPartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from "~/server/s3";

interface S3FileUploadProps {
  bucketName: string;
  onUploadComplete?: (url: string, key: string) => void;
  onUploadError?: (error: Error) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  folder?: string;
  buttonText?: string;
  showPreview?: boolean;
}

interface UploadProgress {
  progress: number;
  status: "idle" | "uploading" | "processing" | "complete" | "error";
  message?: string;
  url?: string;
  key?: string;
  uploadId?: string;
  parts?: { ETag: string; PartNumber: number }[];
  previewUrl?: string;
}

// Size threshold for using multipart upload (5 MB)
const MULTIPART_THRESHOLD = 5 * 1024 * 1024;
// Size of each chunk in multipart upload (5 MB recommended by AWS)
const CHUNK_SIZE = 5 * 1024 * 1024;

export const S3FileUpload: React.FC<S3FileUploadProps> = ({
  bucketName,
  onUploadComplete,
  onUploadError,
  acceptedFileTypes = "*",
  maxSizeMB = 100,
  folder = "uploads",
  buttonText = "Upload File",
  showPreview = true,
}) => {
  const [uploadState, setUploadState] = React.useState<UploadProgress>({
    progress: 0,
    status: "idle",
  });

  // Bind server functions
  const getUploadUrl = useServerFn(getPresignedUploadUrl);
  const getObjectUrl = useServerFn(getS3Url);
  const startMultipartUpload = useServerFn(initiateMultipartUpload);
  const getPartUploadUrl = useServerFn(getPresignedPartUploadUrl);
  const finishMultipartUpload = useServerFn(completeMultipartUpload);
  const cancelMultipartUpload = useServerFn(abortMultipartUpload);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Generate a unique file key
  const generateFileKey = (fileName: string): string => {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 10);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${folder}/${timestamp}-${randomString}-${sanitizedFileName}`;
  };

  // Get MIME type for file
  const getMimeType = (file: File): string => {
    return file.type || "application/octet-stream";
  };

  // Create object URL for preview
  const createPreview = (file: File): string | undefined => {
    if (!showPreview) return undefined;

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");

    if (isImage || isAudio || isVideo) {
      return URL.createObjectURL(file);
    }

    return undefined;
  };

  // Regular upload using presigned URL
  const uploadRegular = async (file: File, key: string) => {
    try {
      // Get content type
      const contentType = getMimeType(file);

      // Step 1: Get presigned URL for upload
      setUploadState((prev) => ({
        ...prev,
        status: "processing",
        message: "Getting upload authorization...",
      }));

      const presignedUrl = await getUploadUrl({
        data: {
          bucket: bucketName,
          key,
          contentType,
        },
      });

      // Step 2: Upload file using fetch API
      setUploadState((prev) => ({
        ...prev,
        status: "uploading",
        message: "Uploading file...",
        progress: 10,
      }));

      // Create an XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();

      // Setup progress tracking
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete =
            Math.round((event.loaded / event.total) * 90) + 10;
          setUploadState((prev) => ({
            ...prev,
            progress: percentComplete,
            message: `Uploading: ${percentComplete}%`,
          }));
        }
      });

      // Create a promise to handle the XHR response
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.open("PUT", presignedUrl, true);
        xhr.setRequestHeader("Content-Type", contentType);

        xhr.onload = function () {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = function () {
          reject(new Error("Network error occurred during upload"));
        };

        xhr.send(file);
      });

      // Wait for upload to complete
      await uploadPromise;

      // Step 3: Return the URL to the uploaded file
      const fileUrl = await getObjectUrl({
        data: {
          bucket: bucketName,
          key,
        },
      });

      // Update state and call callback
      setUploadState({
        status: "complete",
        progress: 100,
        message: "Upload complete",
        url: fileUrl,
        key,
      });

      if (onUploadComplete) {
        onUploadComplete(fileUrl, key);
      }
    } catch (error) {
      console.error("Error during regular upload:", error);
      setUploadState({
        ...uploadState,
        status: "error",
        message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });

      if (onUploadError && error instanceof Error) {
        onUploadError(error);
      }
    }
  };

  // Multipart upload for larger files
  const uploadMultipart = async (file: File, key: string) => {
    let uploadId = "";
    try {
      const contentType = getMimeType(file);

      // Step 1: Initiate multipart upload
      setUploadState((prev) => ({
        ...prev,
        status: "processing",
        message: "Initiating multipart upload...",
      }));

      const initResult = await startMultipartUpload({
        data: {
          bucket: bucketName,
          key,
          contentType,
        },
      });
      uploadId = initResult.uploadId;

      setUploadState((prev) => ({
        ...prev,
        uploadId,
        message: "Multipart upload initiated",
      }));

      // Step 2: Upload parts
      const parts: { ETag: string; PartNumber: number }[] = [];
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);
        const partNumber = i + 1;

        // Get presigned URL for this part
        const presignedUrl = await getPartUploadUrl({
          data: {
            bucket: bucketName,
            key,
            uploadId,
            partNumber,
          },
        });

        // Upload the part
        const response = await fetch(presignedUrl, {
          method: "PUT",
          body: chunk,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to upload part ${partNumber}: ${response.statusText}`,
          );
        }

        // Get ETag from response headers
        const etag = response.headers.get("ETag");
        if (!etag) {
          throw new Error(`No ETag returned for part ${partNumber}`);
        }

        // Add part info
        parts.push({
          ETag: etag.replace(/"/g, ""), // Remove quotes that might be in the ETag
          PartNumber: partNumber,
        });

        // Update progress
        const progress = Math.min(Math.round(((i + 1) / totalChunks) * 95), 95); // Reserve 5% for completion step
        setUploadState((prev) => ({
          ...prev,
          progress,
          message: `Uploading part ${partNumber}/${totalChunks}`,
          parts,
        }));
      }

      // Step 3: Complete multipart upload
      setUploadState((prev) => ({
        ...prev,
        message: "Finalizing upload...",
        progress: 95,
      }));

      const completeResult = await finishMultipartUpload({
        data: {
          bucket: bucketName,
          key,
          uploadId,
          parts,
        },
      });

      setUploadState({
        status: "complete",
        progress: 100,
        message: "Upload complete",
        url: completeResult.location,
        key,
        parts,
      });

      if (onUploadComplete) {
        onUploadComplete(completeResult.location, key);
      }
    } catch (error) {
      console.error("Error during multipart upload:", error);

      // Abort the multipart upload if it was initiated
      if (uploadId) {
        try {
          await cancelMultipartUpload({
            data: {
              bucket: bucketName,
              key,
              uploadId,
            },
          });
        } catch (abortError) {
          console.error("Error aborting multipart upload:", abortError);
        }
      }

      setUploadState({
        ...uploadState,
        status: "error",
        message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });

      if (onUploadError && error instanceof Error) {
        onUploadError(error);
      }
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setUploadState({
        status: "error",
        progress: 0,
        message: `File is too large. Maximum allowed size is ${maxSizeMB}MB.`,
      });
      return;
    }

    // Generate file key and create preview
    const key = generateFileKey(file.name);
    const previewUrl = createPreview(file);

    // Start upload
    setUploadState({
      status: "uploading",
      progress: 0,
      message: "Preparing upload...",
      previewUrl,
    });

    // Choose upload method based on file size
    if (file.size < MULTIPART_THRESHOLD) {
      await uploadRegular(file, key);
    } else {
      await uploadMultipart(file, key);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Render preview based on file type
  const renderPreview = () => {
    if (!showPreview || !uploadState.previewUrl) return null;

    if (
      uploadState.previewUrl.includes("data:image") ||
      (uploadState.previewUrl.startsWith("blob:") &&
        uploadState.previewUrl.includes("image"))
    ) {
      return (
        <div className="mt-4 flex justify-center">
          <img
            src={uploadState.previewUrl}
            alt="Preview"
            className="max-h-64 rounded border border-gray-200 dark:border-gray-700"
          />
        </div>
      );
    } else if (
      uploadState.previewUrl.includes("data:audio") ||
      (uploadState.previewUrl.startsWith("blob:") &&
        uploadState.previewUrl.includes("audio"))
    ) {
      return (
        <div className="mt-4 flex justify-center">
          <audio
            src={uploadState.previewUrl}
            controls
            className="w-full max-w-md"
          />
        </div>
      );
    } else if (
      uploadState.previewUrl.includes("data:video") ||
      (uploadState.previewUrl.startsWith("blob:") &&
        uploadState.previewUrl.includes("video"))
    ) {
      return (
        <div className="mt-4 flex justify-center">
          <video
            src={uploadState.previewUrl}
            controls
            className="max-h-64 rounded border border-gray-200 dark:border-gray-700"
          />
        </div>
      );
    }

    return null;
  };

  // Clean up object URLs when component unmounts or when upload completes
  React.useEffect(() => {
    return () => {
      if (
        uploadState.previewUrl &&
        uploadState.previewUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(uploadState.previewUrl);
      }
    };
  }, [uploadState.previewUrl]);

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        className="hidden"
      />

      {/* Upload button */}
      <button
        onClick={handleUploadClick}
        disabled={
          uploadState.status === "uploading" ||
          uploadState.status === "processing"
        }
        className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-lg border ${
          uploadState.status === "uploading" ||
          uploadState.status === "processing"
            ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        <UploadIcon className="w-5 h-5" />
        <span>{buttonText}</span>
      </button>

      {/* Progress bar */}
      {(uploadState.status === "uploading" ||
        uploadState.status === "processing") && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {uploadState.message || `Uploading... ${uploadState.progress}%`}
          </p>
        </div>
      )}

      {/* Error message */}
      {uploadState.status === "error" && (
        <div className="mt-3 text-sm text-red-500">
          {uploadState.message || "Upload failed. Please try again."}
        </div>
      )}

      {/* Success message */}
      {uploadState.status === "complete" && (
        <div className="mt-3 text-sm text-green-500">
          Upload complete!
          {uploadState.url && (
            <a
              href={uploadState.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline"
            >
              View file
            </a>
          )}
        </div>
      )}

      {/* File preview */}
      {renderPreview()}
    </div>
  );
};
