/**
 * Simplified API middleware functions for route handling
 */
import { createMiddleware } from "@tanstack/react-start";
import { createLogger } from "~/utils/logger";
import { handleApiError } from "~/utils/errorHandling";
import { apiError, apiSuccess } from "~/utils/apiResponse";
import { HTTP_STATUS } from "~/utils/httpStatus";

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
  // Log the incoming request
  logger.info(`API request received:`, {
    path: (context as any)?.request?.url,
    method: (context as any)?.request?.method,
    params: data,
  });

  // Execute the route handler and pass through its result
  const result = await next();
  logger.debug("API response:", result);
  return result as any;
});

/**
 * Middleware that enforces the allowed HTTP methods for a route
 */
export const methodGuardMiddleware = (allowedMethods: string[] = ["GET"]) => {
  return createMiddleware({ type: "function" }).server(
    async ({ next, context }) => {
      const method = (context as any)?.request?.method || "GET";

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

      return (await next()) as any;
    },
  );
};

/**
 * Middleware to parse JSON body for POST/PUT/PATCH requests
 */
export const parseJsonBodyMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, context }) => {
  const request = (context as any)?.request as Request | undefined;
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

  return (await next()) as any;
});
