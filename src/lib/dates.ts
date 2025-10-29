/**
 * @fileoverview Date Utilities - TraxYard Date Handling
 * 
 * Centralized date conversion and validation utilities for consistent
 * handling of date values across the application. Provides safe
 * conversion from various date formats to Date objects with proper
 * validation and fallback handling.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - None (pure utility functions)
 * 
 * @features
 * - Safe date conversion from strings, Date objects, or null/undefined
 * - Invalid date detection and fallback to undefined
 * - Consistent date handling across mappers and components
 * - Type-safe date operations
 * 
 * @example
 * ```typescript
 * import { toDate } from "@/lib/dates";
 * 
 * // Convert various date formats
 * const date1 = toDate("2024-01-15T10:30:00Z"); // Date object
 * const date2 = toDate(new Date()); // Date object (if valid)
 * const date3 = toDate(null); // undefined
 * const date4 = toDate("invalid"); // undefined
 * 
 * // Use in mappers
 * const mapped = {
 *   createdAt: toDate(dto.createdAt),
 *   updatedAt: toDate(dto.updatedAt)
 * };
 * ```
 */

/**
 * Safely converts a value to a Date object or undefined
 * 
 * Handles various input types (string, Date, null, undefined) and
 * validates the resulting date to ensure it's valid. Invalid dates
 * or falsy inputs return undefined.
 * 
 * @param {string | Date | null | undefined} value - Value to convert to Date
 * @returns {Date | undefined} Valid Date object or undefined
 * 
 * @performance
 * - Early return for falsy values
 * - Efficient Date validation using isNaN
 * - Minimal object creation
 * 
 * @example
 * ```typescript
 * // Valid dates
 * toDate("2024-01-15T10:30:00Z"); // Date object
 * toDate(new Date(2024, 0, 15)); // Date object
 * 
 * // Invalid dates
 * toDate("invalid-date"); // undefined
 * toDate(new Date("invalid")); // undefined
 * toDate(null); // undefined
 * toDate(undefined); // undefined
 * 
 * // Use in mappers
 * const mapped = {
 *   createdAt: toDate(dto.createdAt),
 *   lastMove: toDate(dto.lastMoveIoTs)
 * };
 * ```
 */
export const toDate = (value?: string | Date | null): Date | undefined => {
  // Handle falsy values
  if (!value) return undefined;
  
  // Handle Date objects
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  
  // Handle string values
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

/**
 * Formats a date for display in a consistent format
 * 
 * Provides a standardized way to format dates for UI display
 * with proper locale handling and fallback for invalid dates.
 * 
 * @param {Date | undefined} date - Date to format
 * @param {Intl.DateTimeFormatOptions} [options] - Formatting options
 * @returns {string} Formatted date string or fallback text
 * 
 * @example
 * ```typescript
 * import { formatDate } from "@/lib/dates";
 * 
 * formatDate(new Date()); // "1/15/2024, 10:30:00 AM"
 * formatDate(undefined); // "—"
 * formatDate(new Date(), { dateStyle: "short" }); // "1/15/2024"
 * ```
 */
export const formatDate = (
  date: Date | undefined, 
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return "—";
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  };
  
  try {
    return date.toLocaleString(undefined, defaultOptions);
  } catch {
    return "—";
  }
};

/**
 * Checks if a value represents a valid date
 * 
 * Utility function to validate date values before processing
 * or display, with support for various input types.
 * 
 * @param {any} value - Value to check
 * @returns {boolean} True if the value represents a valid date
 * 
 * @example
 * ```typescript
 * import { isValidDate } from "@/lib/dates";
 * 
 * isValidDate("2024-01-15"); // true
 * isValidDate(new Date()); // true
 * isValidDate("invalid"); // false
 * isValidDate(null); // false
 * ```
 */
export const isValidDate = (value: any): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};
