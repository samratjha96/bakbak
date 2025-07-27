import { StorageService } from "./StorageService";
import { S3StorageService } from "./S3StorageService";

/**
 * Factory for creating storage service instances
 *
 * This abstracts the creation of storage services and allows for
 * different storage providers to be used based on configuration.
 */
export class StorageServiceFactory {
  private static instance: StorageServiceFactory;
  private defaultService: StorageService | null = null;
  private serviceCache: Map<string, StorageService> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of the factory
   */
  static getInstance(): StorageServiceFactory {
    if (!StorageServiceFactory.instance) {
      StorageServiceFactory.instance = new StorageServiceFactory();
    }
    return StorageServiceFactory.instance;
  }

  /**
   * Creates a storage service based on the storage type
   * @param type The storage type (currently only "s3" is supported)
   * @param options Options for the specific storage service
   * @returns A storage service instance
   */
  createService(
    type: string = "s3",
    options: Record<string, any> = {},
  ): StorageService {
    const cacheKey = `${type}-${JSON.stringify(options)}`;

    // Return cached instance if available
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey)!;
    }

    let service: StorageService;

    switch (type.toLowerCase()) {
      case "s3":
        service = new S3StorageService(options.bucketName);
        break;
      // Add other storage service types here in the future
      default:
        throw new Error(`Unsupported storage service type: ${type}`);
    }

    // Cache the service instance
    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Gets the default storage service
   * @returns The default storage service
   */
  getDefaultService(): StorageService {
    if (!this.defaultService) {
      // Create default service (S3 using environment variables)
      this.defaultService = this.createService("s3");
    }
    return this.defaultService;
  }

  /**
   * Sets the default storage service
   * @param service The storage service to use as default
   */
  setDefaultService(service: StorageService): void {
    this.defaultService = service;
  }
}
