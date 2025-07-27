import { S3StorageService } from "./S3StorageService";
import type { StorageService } from "./StorageService";

let defaultService: StorageService | null = null;
const serviceCache: Map<string, StorageService> = new Map();

export function getStorageService(): StorageService {
  if (!defaultService) {
    defaultService = createStorageService("s3");
  }
  return defaultService;
}

export function setStorageService(service: StorageService): void {
  defaultService = service;
}

export interface StorageServiceOptions {
  bucketName?: string;
}

export function createStorageService(
  type: "s3",
  options: StorageServiceOptions = {},
): StorageService {
  const cacheKey = `${type}-${JSON.stringify(options)}`;

  if (serviceCache.has(cacheKey)) {
    return serviceCache.get(cacheKey)!;
  }

  let service: StorageService;

  switch (type.toLowerCase()) {
    case "s3":
      service = new S3StorageService(options.bucketName);
      break;
    default:
      throw new Error(`Unsupported storage service type: ${type}`);
  }

  serviceCache.set(cacheKey, service);
  return service;
}

export const storageService = getStorageService();
