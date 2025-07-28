import React, { Component, ErrorInfo, ReactNode } from "react";
import { isDatabaseError, getErrorMessage } from "../utils/errorHandling";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for catching and gracefully handling React errors
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Check if it's a database error for a more friendly message
      if (isDatabaseError(this.state.error)) {
        return this.renderDatabaseError();
      }

      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-6 max-w-lg mx-auto my-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-red-600 dark:text-red-400 text-xl font-semibold mb-4">
            Something went wrong!
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {this.state.error?.message || "An unknown error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  private renderDatabaseError() {
    const errorMessage = getErrorMessage(this.state.error, "ErrorBoundary");

    return (
      <div className="p-6 max-w-lg mx-auto my-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-yellow-600 dark:text-yellow-400 text-xl font-semibold mb-4">
          Database Setup Required
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{errorMessage}</p>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
          <code className="text-sm">npm run db:setup:seed</code>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Run the above command in your terminal to set up the database with
          test data.
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
