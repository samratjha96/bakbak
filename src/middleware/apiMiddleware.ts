/**
 * Simplified API middleware functions for route handling
 */
import { createMiddleware } from "@tanstack/react-start";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import { apiError, apiSuccess, HTTP_STATUS } from "~/utils/apiResponse";

// Create a logger for the API middleware
const logger = createLogger("ApiMiddleware");

/**
 * Middleware that adds common API response handling
 * - Standardizes success/error responses
 * - Adds consistent headers
 * - Provides logging for all API requests
 */
export const apiResponseMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, data, context }) => {
  try {
    // Log the incoming request
    logger.info(`API request received:`, {
      path: context.request?.url,
      method: context.request?.method,
      params: data,
    });

    // Execute the route handler
    const result = await next();

    // Log the successful response
    logger.debug("API response:", result);

    // Convert the result to a standardized Response
    if (result instanceof Response) {
      // If result is already a Response, pass it through
      return result;
    }

    // For other results, create a standard response
    return apiSuccess(result);
  } catch (error) {
    // Handle errors consistently
    const { error: errorMessage, status } = handleApiError(
      error,
      context.request?.url || "API",
    );
    logger.error(`API error (${status}):`, errorMessage);
    return apiError(errorMessage, status);
  }
});

/**
 * Middleware that enforces the allowed HTTP methods for a route
 */
export const methodGuardMiddleware = (allowedMethods: string[] = ["GET"]) => {
  return createMiddleware({ type: "function" }).server(
    async ({ next, context }) => {
      const method = context.request?.method || "GET";

      if (!allowedMethods.includes(method)) {
        logger.warn(
          `Method ${method} not allowed for this route, allowed: [${allowedMethods.join(", ")}]`,
        );

        // Create headers with Allow header for proper HTTP response
        const additionalHeaders = { Allow: allowedMethods.join(", ") };
        return apiError(
          "Method not allowed",
          HTTP_STATUS.METHOD_NOT_ALLOWED,
          additionalHeaders,
        );
      }

      return next();
    },
  );
};

/**
 * Middleware to parse JSON body for POST/PUT/PATCH requests
 */
export const parseJsonBodyMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, context }) => {
  const request = context.request;
  if (!request) {
    return next();
  }

  const method = request.method;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      // Try to parse the request body as JSON
      const contentType = request.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        const body = await request.json();
        // Add parsed body to the context
        (context as any).body = body;
      }
    } catch (error) {
      logger.error("Failed to parse request body as JSON:", error);
      return apiError("Invalid JSON in request body", HTTP_STATUS.BAD_REQUEST);
    }
  }

  return next();
});
