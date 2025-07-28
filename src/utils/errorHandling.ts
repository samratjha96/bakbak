/**
 * Simplified error handling utilities
 */
import { createLogger } from "./logger";
import { notFound } from "@tanstack/react-router";
import { HTTP_STATUS } from "./httpStatus";

const logger = createLogger("ErrorHandler");

// Standard application error type
export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Unified error handler for all error cases
 * @param error - The error that was thrown
 * @param context - Contextual information about where the error occurred
 * @returns A standardized error response object
 */
export function handleApiError(
  error: unknown,
  context: string,
): { error: string; status: number } {
  logger.error(`Error in ${context}:`, error);

  if (error === notFound()) {
    return {
      error: "Resource not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (error instanceof AppError) {
    return {
      error: error.message,
      status: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message || "An unexpected error occurred",
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    error: "Unknown error occurred",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  };
}

/**
 * Error handler for component error handling that logs and returns the error message
 * @param error - The error that was thrown
 * @param context - Contextual information about where the error occurred
 * @returns The error message as a string
 */
export function getErrorMessage(error: unknown, context: string): string {
  logger.error(`Error in ${context}:`, error);

  if (error instanceof Error) {
    // Check for database specific errors
    if (isMissingTableError(error)) {
      return "Database structure not initialized. Please run setup first.";
    }

    if (isMissingDatabaseError(error)) {
      return "Database file not found. Please make sure the database is set up properly.";
    }

    if (isDatabaseError(error)) {
      return "Database error occurred. Please check your database configuration.";
    }

    return error.message || "An unexpected error occurred";
  }

  return "Unknown error occurred";
}

/**
 * Check if the error indicates that a database table is missing
 * @param error Any error to check
 * @returns boolean indicating if this is a missing table error
 */
export function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes("no such table:");
}

/**
 * Check if the error indicates that the database file is missing
 * @param error Any error to check
 * @returns boolean indicating if this is a missing database error
 */
export function isMissingDatabaseError(error: unknown): boolean {
  if (!error) return false;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes("SQLITE_CANTOPEN") ||
    errorMessage.includes("cannot open database file")
  );
}

/**
 * Check if the error is related to database operations
 * @param error Any error to check
 * @returns boolean indicating if this is a database error
 */
export function isDatabaseError(error: unknown): boolean {
  if (!error) return false;
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    errorMessage.includes("SQLITE_") ||
    errorMessage.includes("no such table:") ||
    errorMessage.includes("cannot open database file") ||
    errorMessage.includes("database is locked")
  );
}
