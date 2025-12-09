/**
 * Custom Error Classes
 * 
 * Provides structured error handling with specific error types
 * for different failure scenarios in the application.
 * 
 * @module server/errors
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// AUTHENTICATION ERRORS
// ============================================

/**
 * Thrown when a user is not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_REQUIRED", 401);
  }
}

/**
 * Thrown when a user lacks permission for an action
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
  }
}

/**
 * Thrown when a token is invalid or expired
 */
export class TokenError extends AppError {
  constructor(message: string = "Invalid or expired token") {
    super(message, "INVALID_TOKEN", 401);
  }
}

// ============================================
// RESOURCE ERRORS
// ============================================

/**
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", 404, true, { resource, id });
  }
}

/**
 * Thrown when a resource already exists
 */
export class ConflictError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(
      `${resource} with ${field} "${value}" already exists`,
      "CONFLICT",
      409,
      true,
      { resource, field, value }
    );
  }
}

// ============================================
// VALIDATION ERRORS
// ============================================

/**
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(
    errors: Array<{ field: string; message: string }>,
    message: string = "Validation failed"
  ) {
    super(message, "VALIDATION_ERROR", 400, true, { errors });
    this.errors = errors;
  }

  static fromField(field: string, message: string): ValidationError {
    return new ValidationError([{ field, message }]);
  }
}

// ============================================
// RATE LIMIT ERRORS
// ============================================

/**
 * Thrown when a rate limit is exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message: string = "Rate limit exceeded",
    retryAfter: number = 60
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, true, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

// ============================================
// SUBSCRIPTION ERRORS
// ============================================

/**
 * Thrown when a feature requires a higher subscription tier
 */
export class SubscriptionRequiredError extends AppError {
  public readonly requiredTier: string;
  public readonly currentTier: string;

  constructor(
    requiredTier: string,
    currentTier: string,
    feature: string
  ) {
    super(
      `${feature} requires ${requiredTier} subscription. You are currently on ${currentTier}.`,
      "SUBSCRIPTION_REQUIRED",
      402,
      true,
      { requiredTier, currentTier, feature }
    );
    this.requiredTier = requiredTier;
    this.currentTier = currentTier;
  }
}

/**
 * Thrown when a usage limit is exceeded
 */
export class UsageLimitError extends AppError {
  public readonly limit: number;
  public readonly current: number;
  public readonly resource: string;

  constructor(resource: string, limit: number, current: number) {
    super(
      `You have reached your ${resource} limit (${current}/${limit}). Please upgrade your subscription.`,
      "USAGE_LIMIT_EXCEEDED",
      402,
      true,
      { resource, limit, current }
    );
    this.limit = limit;
    this.current = current;
    this.resource = resource;
  }
}

// ============================================
// EXTERNAL SERVICE ERRORS
// ============================================

/**
 * Thrown when an external API call fails
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    service: string,
    message: string = "External service error",
    originalError?: Error
  ) {
    super(
      `${service}: ${message}`,
      "EXTERNAL_SERVICE_ERROR",
      502,
      true,
      { service, originalMessage: originalError?.message }
    );
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Thrown when a social media API call fails
 */
export class SocialMediaError extends ExternalServiceError {
  public readonly platform: string;

  constructor(platform: string, message: string, originalError?: Error) {
    super(`Social Media (${platform})`, message, originalError);
    this.platform = platform;
  }
}

/**
 * Thrown when the AI service fails
 */
export class AIServiceError extends ExternalServiceError {
  constructor(message: string = "AI service temporarily unavailable", originalError?: Error) {
    super("AI Service", message, originalError);
  }
}

// ============================================
// DATABASE ERRORS
// ============================================

/**
 * Thrown when a database operation fails
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed",
    originalError?: Error
  ) {
    super(
      message,
      "DATABASE_ERROR",
      500,
      false,
      { originalMessage: originalError?.message }
    );
  }
}

// ============================================
// FILE ERRORS
// ============================================

/**
 * Thrown when a file upload fails
 */
export class FileUploadError extends AppError {
  constructor(
    message: string = "File upload failed",
    details?: Record<string, unknown>
  ) {
    super(message, "FILE_UPLOAD_ERROR", 400, true, details);
  }
}

/**
 * Thrown when a file is too large
 */
export class FileTooLargeError extends FileUploadError {
  constructor(maxSizeMb: number, actualSizeMb: number) {
    super(
      `File size (${actualSizeMb.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMb}MB)`,
      { maxSizeMb, actualSizeMb }
    );
  }
}

/**
 * Thrown when a file type is not supported
 */
export class UnsupportedFileTypeError extends FileUploadError {
  constructor(fileType: string, supportedTypes: string[]) {
    super(
      `File type "${fileType}" is not supported. Supported types: ${supportedTypes.join(", ")}`,
      { fileType, supportedTypes }
    );
  }
}

// ============================================
// ERROR UTILITIES
// ============================================

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Converts an unknown error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, "INTERNAL_ERROR", 500, false);
  }
  
  return new AppError(String(error), "INTERNAL_ERROR", 500, false);
}

/**
 * Formats an error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
  if (isAppError(error)) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      details: error.details,
      stack: error.stack
    };
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  return { error: String(error) };
}

/**
 * Formats an error for API response (hides internal details)
 */
export function formatErrorForResponse(error: unknown): {
  code: string;
  message: string;
  details?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.isOperational ? error.details : undefined
    };
  }
  
  // Don't expose internal error details to clients
  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred"
  };
}
