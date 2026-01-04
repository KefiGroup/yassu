/**
 * Centralized Error Handling Utility
 * Provides consistent error handling and user feedback across the application
 */

import { toast } from "@/hooks/use-toast";

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
}

export class AppError extends Error {
  code?: string;
  field?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number, field?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

/**
 * Parse error from various sources (fetch response, Error object, string)
 */
export async function parseError(error: unknown): Promise<ApiError> {
  // Handle Response objects from fetch
  if (error instanceof Response) {
    try {
      const data = await error.json();
      return {
        message: data.error || data.message || `Request failed with status ${error.status}`,
        code: data.code,
        field: data.field,
        statusCode: error.status,
      };
    } catch {
      return {
        message: `Request failed with status ${error.status}`,
        statusCode: error.status,
      };
    }
  }

  // Handle AppError objects
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      field: error.field,
      statusCode: error.statusCode,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    return {
      message: error,
    };
  }

  // Handle unknown errors
  return {
    message: "An unexpected error occurred. Please try again.",
  };
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: ApiError): string {
  // Network errors
  if (error.statusCode === 0 || error.message.includes("Failed to fetch")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // Authentication errors
  if (error.statusCode === 401) {
    return "You need to be logged in to perform this action. Please sign in and try again.";
  }

  // Authorization errors
  if (error.statusCode === 403) {
    return "You don't have permission to perform this action.";
  }

  // Not found errors
  if (error.statusCode === 404) {
    return "The requested resource was not found.";
  }

  // Validation errors
  if (error.statusCode === 400) {
    return error.message || "Please check your input and try again.";
  }

  // Rate limiting
  if (error.statusCode === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Server errors
  if (error.statusCode && error.statusCode >= 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }

  // Return the original message if it's user-friendly
  return error.message;
}

/**
 * Handle error with toast notification
 */
export async function handleError(error: unknown, customMessage?: string): Promise<void> {
  const parsedError = await parseError(error);
  const message = customMessage || getUserFriendlyMessage(parsedError);

  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });

  // Log error for debugging (in production, send to error tracking service)
  console.error("Error:", parsedError);
}

/**
 * Handle success with toast notification
 */
export function handleSuccess(message: string, description?: string): void {
  toast({
    title: message,
    description: description,
  });
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: ApiError) => void;
  }
): Promise<T | null> {
  try {
    const result = await operation();
    
    if (options?.successMessage) {
      handleSuccess(options.successMessage);
    }
    
    if (options?.onSuccess) {
      options.onSuccess(result);
    }
    
    return result;
  } catch (error) {
    const parsedError = await parseError(error);
    
    if (options?.onError) {
      options.onError(parsedError);
    } else {
      await handleError(error, options?.errorMessage);
    }
    
    return null;
  }
}

/**
 * Retry failed operations with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Validate form field and return error message
 */
export function validateField(
  value: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    email?: boolean;
    url?: boolean;
    custom?: (value: string) => string | null;
  }
): string | null {
  // Required check
  if (rules.required && !value.trim()) {
    return "This field is required";
  }

  // Skip other validations if empty and not required
  if (!value.trim()) {
    return null;
  }

  // Min length
  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  // Max length
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  // Email validation
  if (rules.email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return "Please enter a valid email address";
    }
  }

  // URL validation
  if (rules.url) {
    try {
      new URL(value);
    } catch {
      return "Please enter a valid URL";
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return "Invalid format";
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}
