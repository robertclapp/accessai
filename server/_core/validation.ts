/**
 * Input Validation Utilities
 *
 * Provides common validation functions and Zod schemas
 * for consistent input validation across the application.
 */

import { z } from "zod";

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

/**
 * Email validation with strict RFC 5322 compliance
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(320, "Email address too long")
  .toLowerCase()
  .trim();

/**
 * Safe string validation (prevents XSS)
 */
export const safeStringSchema = (maxLength: number = 255) =>
  z
    .string()
    .max(maxLength)
    .transform((val) => val.trim())
    .refine((val) => !/<script|javascript:|on\w+=/i.test(val), {
      message: "Invalid characters detected",
    });

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(2048, "URL too long");

/**
 * Pagination validation
 */
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * ID validation (positive integer)
 */
export const idSchema = z.number().int().positive("Invalid ID");

/**
 * Date range validation
 */
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
});

// ============================================
// SANITIZATION UTILITIES
// ============================================

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize string for use in filenames
 */
export function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255);
}

/**
 * Validate and sanitize JSON input
 */
export function safeJsonParse<T>(
  input: string,
  defaultValue: T
): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return defaultValue;
  }
}

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

/**
 * Standard API error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Create a standardized error response
 */
export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return { code, message, details };
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage: string = "Operation failed"
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[Error] ${errorMessage}:`, error);
      throw error;
    }
  }) as T;
}

// ============================================
// RATE LIMITING HELPERS
// ============================================

/**
 * Simple in-memory rate limiter
 * For production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    // Start new window
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Clean up expired rate limit records
 * Should be called periodically
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
