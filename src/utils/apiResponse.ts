/**
 * Simplified API response utilities
 */
import { HTTP_STATUS } from "./httpStatus";

// Standard headers for JSON responses
const JSON_HEADERS = {
  "Content-Type": "application/json",
};

/**
 * Creates a standardized successful response
 * @param data - The data to include in the response
 * @param status - HTTP status code (default: 200)
 * @returns Response object with consistent format
 */
export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json(data, {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Creates a standardized error response
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param additionalHeaders - Additional headers to include
 * @returns Response object with consistent error format
 */
export function apiError(
  message: string,
  status = 500,
  additionalHeaders?: Record<string, string>,
): Response {
  const headers = new Headers(JSON_HEADERS);

  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  return Response.json(
    { error: message },
    {
      status,
      headers,
    },
  );
}

/**
 * Creates a standardized not found response
 * @param message - Optional custom message
 * @returns Response object with 404 status
 */
export function apiNotFound(message = "Resource not found"): Response {
  return apiError(message, HTTP_STATUS.NOT_FOUND);
}

/**
 * Creates a standardized bad request response
 * @param message - Optional custom message
 * @returns Response object with 400 status
 */
export function apiBadRequest(message = "Invalid request"): Response {
  return apiError(message, HTTP_STATUS.BAD_REQUEST);
}

/**
 * Creates a standardized method not allowed response
 * @param allowedMethods - List of allowed HTTP methods
 * @returns Response object with 405 status
 */
export function apiMethodNotAllowed(allowedMethods: string[] = []): Response {
  const additionalHeaders =
    allowedMethods.length > 0
      ? { Allow: allowedMethods.join(", ") }
      : undefined;

  return apiError(
    "Method not allowed",
    HTTP_STATUS.METHOD_NOT_ALLOWED,
    additionalHeaders,
  );
}
