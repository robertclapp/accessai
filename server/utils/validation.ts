/**
 * Validation Utilities
 * 
 * Provides reusable validation functions for common input types
 * and business rules.
 * 
 * @module server/utils/validation
 */

import { VALIDATION_LIMITS, PLATFORM_CHAR_LIMITS } from "../../shared/constants";
import { ValidationError } from "../errors";

// ============================================
// STRING VALIDATION
// ============================================

/**
 * Validates that a string is not empty
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string
): string {
  if (!value || value.trim().length === 0) {
    throw ValidationError.fromField(fieldName, `${fieldName} is required`);
  }
  return value.trim();
}

/**
 * Validates string length
 */
export function validateLength(
  value: string,
  fieldName: string,
  minLength: number = 0,
  maxLength: number = Infinity
): string {
  if (value.length < minLength) {
    throw ValidationError.fromField(
      fieldName,
      `${fieldName} must be at least ${minLength} characters`
    );
  }
  if (value.length > maxLength) {
    throw ValidationError.fromField(
      fieldName,
      `${fieldName} must be at most ${maxLength} characters`
    );
  }
  return value;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    throw ValidationError.fromField("email", "Invalid email format");
  }
  
  if (trimmed.length > VALIDATION_LIMITS.emailMaxLength) {
    throw ValidationError.fromField(
      "email",
      `Email must be at most ${VALIDATION_LIMITS.emailMaxLength} characters`
    );
  }
  
  return trimmed;
}

/**
 * Validates URL format
 */
export function validateUrl(url: string, fieldName: string = "url"): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw ValidationError.fromField(fieldName, "Invalid URL format");
  }
}

// ============================================
// CONTENT VALIDATION
// ============================================

/**
 * Validates post content for a specific platform
 */
export function validatePostContent(
  content: string,
  platform: keyof typeof PLATFORM_CHAR_LIMITS
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const limit = PLATFORM_CHAR_LIMITS[platform];
  
  if (!content || content.trim().length === 0) {
    errors.push("Content is required");
  } else if (content.length > limit) {
    errors.push(`Content exceeds ${platform} limit of ${limit} characters (current: ${content.length})`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates hashtags for accessibility (CamelCase)
 */
export function validateHashtagAccessibility(hashtag: string): {
  valid: boolean;
  suggestion?: string;
} {
  // Remove # if present
  const tag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;
  
  // Check if it's a single word (no spaces, already accessible)
  if (!/[a-z][A-Z]/.test(tag) && tag.toLowerCase() === tag && tag.includes(" ") === false) {
    // Single lowercase word - might need CamelCase if multi-word
    const words = tag.split(/(?=[A-Z])|_|-|\s/);
    if (words.length > 1) {
      const suggestion = words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
      return { valid: false, suggestion: `#${suggestion}` };
    }
  }
  
  return { valid: true };
}

/**
 * Converts hashtags to accessible CamelCase format
 */
export function toAccessibleHashtag(hashtag: string): string {
  // Remove # if present
  const tag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;
  
  // Split by common separators and capitalize each word
  const words = tag.split(/(?=[A-Z])|_|-|\s/).filter(Boolean);
  
  const camelCase = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  
  return `#${camelCase}`;
}

// ============================================
// ARRAY VALIDATION
// ============================================

/**
 * Validates array length
 */
export function validateArrayLength<T>(
  array: T[],
  fieldName: string,
  minLength: number = 0,
  maxLength: number = Infinity
): T[] {
  if (array.length < minLength) {
    throw ValidationError.fromField(
      fieldName,
      `${fieldName} must have at least ${minLength} items`
    );
  }
  if (array.length > maxLength) {
    throw ValidationError.fromField(
      fieldName,
      `${fieldName} must have at most ${maxLength} items`
    );
  }
  return array;
}

/**
 * Validates tags array
 */
export function validateTags(tags: string[]): string[] {
  if (tags.length > VALIDATION_LIMITS.maxTags) {
    throw ValidationError.fromField(
      "tags",
      `Maximum ${VALIDATION_LIMITS.maxTags} tags allowed`
    );
  }
  
  return tags.map(tag => {
    const trimmed = tag.trim();
    if (trimmed.length > VALIDATION_LIMITS.tagMaxLength) {
      throw ValidationError.fromField(
        "tags",
        `Tag "${trimmed.slice(0, 20)}..." exceeds maximum length of ${VALIDATION_LIMITS.tagMaxLength}`
      );
    }
    return trimmed;
  });
}

// ============================================
// NUMBER VALIDATION
// ============================================

/**
 * Validates that a number is within a range
 */
export function validateNumberRange(
  value: number,
  fieldName: string,
  min: number = -Infinity,
  max: number = Infinity
): number {
  if (value < min) {
    throw ValidationError.fromField(fieldName, `${fieldName} must be at least ${min}`);
  }
  if (value > max) {
    throw ValidationError.fromField(fieldName, `${fieldName} must be at most ${max}`);
  }
  return value;
}

/**
 * Validates that a value is a positive integer
 */
export function validatePositiveInteger(
  value: number,
  fieldName: string
): number {
  if (!Number.isInteger(value) || value < 1) {
    throw ValidationError.fromField(fieldName, `${fieldName} must be a positive integer`);
  }
  return value;
}

// ============================================
// ENUM VALIDATION
// ============================================

/**
 * Validates that a value is one of the allowed values
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (!allowedValues.includes(value as T)) {
    throw ValidationError.fromField(
      fieldName,
      `${fieldName} must be one of: ${allowedValues.join(", ")}`
    );
  }
  return value as T;
}

// ============================================
// COMPOSITE VALIDATION
// ============================================

/**
 * Validates multiple fields and collects all errors
 */
export function validateAll(
  validations: Array<() => void>
): void {
  const errors: Array<{ field: string; message: string }> = [];
  
  for (const validation of validations) {
    try {
      validation();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(...error.errors);
      } else {
        throw error;
      }
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitizes a string by removing potentially dangerous characters
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Sanitizes HTML content (basic XSS prevention)
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
