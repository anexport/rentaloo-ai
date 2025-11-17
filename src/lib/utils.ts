import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a Date object to YYYY-MM-DD string using local timezone.
 * This prevents timezone conversion issues when converting dates to strings.
 * Use this instead of toISOString().split("T")[0] to preserve the calendar day
 * the user selected, regardless of their timezone offset.
 */
export const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Format a date string for user-friendly display.
 * Converts date strings (YYYY-MM-DD or ISO format) to a readable format.
 * Example: "2024-01-15" -> "Jan 15, 2024"
 */
export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

/**
 * Type guard to check if an error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}

/**
 * Type-safe localStorage wrapper with validation
 */
export const safeLocalStorage = {
  getItem<T>(key: string, validator: (value: unknown) => value is T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;

      try {
        const parsed: unknown = JSON.parse(item);
        return validator(parsed) ? parsed : null;
      } catch {
        // If not JSON, treat as string and validate
        const stringValue: unknown = item;
        return validator(stringValue) ? stringValue : null;
      }
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  },
};