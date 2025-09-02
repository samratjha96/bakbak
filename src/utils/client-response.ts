import type { ServerResponse } from "~/utils/server-errors";

/**
 * Utility to extract data from server responses safely
 * Handles both success and error cases
 */
export function extractData<T>(response: ServerResponse<T>): T | null {
  if (response.success) {
    return response.data;
  }
  return null;
}

/**
 * Check if server response is successful
 */
export function isSuccess<T>(response: ServerResponse<T>): response is { success: true; data: T; timestamp: string } {
  return response.success === true;
}

/**
 * Check if server response is an error
 */
export function isError<T>(response: ServerResponse<T>): response is { success: false; error: any; } {
  return response.success === false;
}

/**
 * Get error message from server response
 */
export function getErrorMessage<T>(response: ServerResponse<T>): string | null {
  if (!response.success) {
    return response.error.message || 'An error occurred';
  }
  return null;
}

/**
 * Use this hook to unwrap server response data in React components
 * Throws error if response is not successful (useful with error boundaries)
 */
export function unwrapResponse<T>(response: ServerResponse<T>): T {
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error.message || 'Server request failed');
}