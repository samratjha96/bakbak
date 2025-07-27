/**
 * Simplified API response utilities
 */

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

// Export HTTP status constants for common use cases
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
};
