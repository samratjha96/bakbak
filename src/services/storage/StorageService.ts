/**
 * StorageService interface
 *
 * Abstract interface for file storage operations. Implementations may include
 * cloud storage (S3, Azure Blob, GCS) or local file system storage.
 */
export interface StorageService {
  /**
   * Uploads a file to storage
   * @param path The storage path/key where the file will be stored
   * @param file The file content as File, Buffer, or Uint8Array
   * @param metadata Optional metadata to store with the file
   * @returns A promise that resolves to the URL of the uploaded file
   */
  uploadFile(
    path: string,
    file: File | Buffer | Uint8Array,
    metadata?: Record<string, string>,
  ): Promise<string>;

  /**
   * Downloads a file from storage
   * @param path The storage path/key to the file
   * @returns A promise that resolves to the file content as a Buffer
   */
  downloadFile(path: string): Promise<Buffer>;

  /**
   * Deletes a file from storage
   * @param path The storage path/key to the file
   * @returns A promise that resolves when the file is deleted
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Checks if a file exists in storage
   * @param path The storage path/key to check
   * @returns A promise that resolves to true if the file exists, false otherwise
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Uploads JSON data to storage
   * @param path The storage path/key where the data will be stored
   * @param data The data object to store
   * @returns A promise that resolves to the URL of the uploaded file
   */
  uploadJSON<T>(path: string, data: T): Promise<string>;

  /**
   * Downloads and parses JSON data from storage
   * @param path The storage path/key to the JSON file
   * @returns A promise that resolves to the parsed JSON data
   */
  downloadJSON<T>(path: string): Promise<T>;

  /**
   * Generates a signed URL for temporary access to a file
   * @param path The storage path/key to the file
   * @param expiresIn Expiration time in seconds
   * @returns A promise that resolves to the signed URL
   */
  getSignedUrl(path: string, expiresIn: number): Promise<string>;

  /**
   * Lists files in storage with the given prefix
   * @param prefix The prefix to filter files by
   * @returns A promise that resolves to an array of file paths
   */
  listFiles(prefix: string): Promise<string[]>;
}
