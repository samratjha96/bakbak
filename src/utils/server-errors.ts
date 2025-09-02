export enum ServerErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
}

export interface ServerErrorResponse {
  success: false;
  error: {
    code: ServerErrorCode;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface ServerSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

export type ServerResponse<T = any> = ServerSuccessResponse<T> | ServerErrorResponse;

export class ServerError extends Error {
  constructor(
    public code: ServerErrorCode,
    message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

// Predefined error factories
export const ServerErrors = {
  unauthorized: (message: string = 'Authentication required', details?: any) =>
    new ServerError(ServerErrorCode.UNAUTHORIZED, message, details, 401),
  
  forbidden: (message: string = 'Access denied', details?: any) =>
    new ServerError(ServerErrorCode.FORBIDDEN, message, details, 403),
  
  notFound: (resource: string = 'Resource', details?: any) =>
    new ServerError(ServerErrorCode.NOT_FOUND, `${resource} not found`, details, 404),
  
  validation: (message: string, details?: any) =>
    new ServerError(ServerErrorCode.VALIDATION_ERROR, message, details, 400),
  
  database: (message: string = 'Database operation failed', details?: any) =>
    new ServerError(ServerErrorCode.DATABASE_ERROR, message, details, 500),
  
  internal: (message: string = 'Internal server error', details?: any) =>
    new ServerError(ServerErrorCode.INTERNAL_ERROR, message, details, 500),
  
  rateLimit: (message: string = 'Rate limit exceeded', details?: any) =>
    new ServerError(ServerErrorCode.RATE_LIMIT, message, details, 429),
};

// Error logging utility
export function logServerError(error: Error | ServerError, context?: string) {
  const timestamp = new Date().toISOString();
  const isServerError = error instanceof ServerError;
  
  const logData = {
    timestamp,
    context: context || 'Unknown',
    name: error.name,
    message: error.message,
    code: isServerError ? error.code : 'UNKNOWN',
    details: isServerError ? error.details : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };

  // In production, you might want to send to external logging service
  if (process.env.NODE_ENV === 'development') {
    console.error('Server Error:', JSON.stringify(logData, null, 2));
  } else {
    // Production logging (could integrate with external service)
    console.error('Server Error:', {
      timestamp: logData.timestamp,
      context: logData.context,
      code: logData.code,
      message: logData.message,
    });
  }
}

// Main error handler wrapper
export function handleServerError(error: unknown, context?: string): ServerErrorResponse {
  logServerError(error instanceof Error ? error : new Error(String(error)), context);
  
  if (error instanceof ServerError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  // Handle unexpected errors
  return {
    success: false,
    error: {
      code: ServerErrorCode.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error))
        : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  };
}

// Success response helper
export function createSuccessResponse<T>(data: T): ServerSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

// Async error boundary for server functions
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<ServerResponse<T>> {
  try {
    const result = await fn();
    return createSuccessResponse(result);
  } catch (error) {
    return handleServerError(error, context);
  }
}

// Auth error helpers
export function requireAuth(): void {
  throw ServerErrors.unauthorized('Authentication required to access this resource');
}

export function requireOwnership(resourceName: string = 'resource'): void {
  throw ServerErrors.forbidden(`You don't have permission to access this ${resourceName}`);
}

// Validation helpers
export function validateRequired<T>(value: T, field: string): T {
  if (value === null || value === undefined || value === '') {
    throw ServerErrors.validation(`${field} is required`);
  }
  return value;
}

export function validateString(value: unknown, field: string, minLength?: number, maxLength?: number): string {
  if (typeof value !== 'string') {
    throw ServerErrors.validation(`${field} must be a string`);
  }
  
  if (minLength && value.length < minLength) {
    throw ServerErrors.validation(`${field} must be at least ${minLength} characters`);
  }
  
  if (maxLength && value.length > maxLength) {
    throw ServerErrors.validation(`${field} must be no more than ${maxLength} characters`);
  }
  
  return value;
}

export function validateNumber(value: unknown, field: string, min?: number, max?: number): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw ServerErrors.validation(`${field} must be a valid number`);
  }
  
  if (min !== undefined && num < min) {
    throw ServerErrors.validation(`${field} must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw ServerErrors.validation(`${field} must be no more than ${max}`);
  }
  
  return num;
}