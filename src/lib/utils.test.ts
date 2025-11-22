import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  cn,
  formatDateForStorage,
  formatDateForDisplay,
  isError,
  getErrorMessage,
  safeLocalStorage,
} from "./utils";

describe("Utils", () => {
  describe("cn()", () => {
    it("should merge class names", () => {
      expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
    });

    it("should handle conditional classes", () => {
      expect(cn("btn", false && "hidden", "active")).toBe("btn active");
    });

    it("should merge Tailwind classes correctly", () => {
      // twMerge should handle conflicting Tailwind classes
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("should handle arrays of classes", () => {
      expect(cn(["btn", "btn-lg"], "active")).toBe("btn btn-lg active");
    });

    it("should handle objects with boolean values", () => {
      expect(cn({ btn: true, hidden: false, active: true })).toBe("btn active");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle undefined and null", () => {
      expect(cn(undefined, null, "btn")).toBe("btn");
    });

    it("should handle duplicate classes", () => {
      // Note: clsx/twMerge may or may not deduplicate simple duplicates
      // This test just ensures it doesn't throw an error
      const result = cn("btn", "btn", "btn");
      expect(result).toContain("btn");
    });
  });

  describe("formatDateForStorage()", () => {
    it("should format date to YYYY-MM-DD", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDateForStorage(date)).toBe("2024-01-15");
    });

    it("should pad single-digit months", () => {
      const date = new Date(2024, 0, 1); // January 1, 2024
      expect(formatDateForStorage(date)).toBe("2024-01-01");
    });

    it("should pad single-digit days", () => {
      const date = new Date(2024, 11, 5); // December 5, 2024
      expect(formatDateForStorage(date)).toBe("2024-12-05");
    });

    it("should handle end of year", () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(formatDateForStorage(date)).toBe("2024-12-31");
    });

    it("should handle leap year", () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      expect(formatDateForStorage(date)).toBe("2024-02-29");
    });

    it("should preserve local date regardless of timezone", () => {
      // Create date at 11 PM on Jan 15 - might cross into next day in UTC
      const date = new Date(2024, 0, 15, 23, 0, 0);
      // Should still be Jan 15 in local storage format
      expect(formatDateForStorage(date)).toBe("2024-01-15");
    });

    it("should handle different years", () => {
      const date1 = new Date(2020, 5, 10);
      const date2 = new Date(2025, 5, 10);
      expect(formatDateForStorage(date1)).toBe("2020-06-10");
      expect(formatDateForStorage(date2)).toBe("2025-06-10");
    });
  });

  describe("formatDateForDisplay()", () => {
    it("should format YYYY-MM-DD to readable format", () => {
      const result = formatDateForDisplay("2024-01-15");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should handle different months", () => {
      expect(formatDateForDisplay("2024-12-25")).toBe("Dec 25, 2024");
      expect(formatDateForDisplay("2024-07-04")).toBe("Jul 4, 2024");
    });

    it("should handle ISO format strings", () => {
      const result = formatDateForDisplay("2024-01-15T12:00:00Z");
      // Should still extract and format the date part
      expect(result).toContain("2024");
      expect(result).toContain("Jan");
    });

    it("should handle single-digit days", () => {
      const result = formatDateForDisplay("2024-03-05");
      expect(result).toBe("Mar 5, 2024");
    });

    it("should handle different years", () => {
      expect(formatDateForDisplay("2020-06-10")).toBe("Jun 10, 2020");
      expect(formatDateForDisplay("2025-08-22")).toBe("Aug 22, 2025");
    });
  });

  describe("isError()", () => {
    it("should return true for Error instances", () => {
      expect(isError(new Error("test"))).toBe(true);
    });

    it("should return true for TypeError", () => {
      expect(isError(new TypeError("test"))).toBe(true);
    });

    it("should return true for custom Error subclasses", () => {
      class CustomError extends Error {}
      expect(isError(new CustomError("test"))).toBe(true);
    });

    it("should return false for string", () => {
      expect(isError("error message")).toBe(false);
    });

    it("should return false for object with message property", () => {
      expect(isError({ message: "error" })).toBe(false);
    });

    it("should return false for null", () => {
      expect(isError(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isError(undefined)).toBe(false);
    });

    it("should return false for number", () => {
      expect(isError(404)).toBe(false);
    });
  });

  describe("getErrorMessage()", () => {
    it("should extract message from Error instance", () => {
      const error = new Error("Something went wrong");
      expect(getErrorMessage(error)).toBe("Something went wrong");
    });

    it("should extract message from TypeError", () => {
      const error = new TypeError("Type mismatch");
      expect(getErrorMessage(error)).toBe("Type mismatch");
    });

    it("should return string errors as-is", () => {
      expect(getErrorMessage("Simple error string")).toBe("Simple error string");
    });

    it("should extract message from object with message property", () => {
      const error = { message: "API error" };
      expect(getErrorMessage(error)).toBe("API error");
    });

    it("should handle object with non-string message", () => {
      const error = { message: 404 };
      expect(getErrorMessage(error)).toBe("404");
    });

    it("should return default message for null", () => {
      expect(getErrorMessage(null)).toBe("An unknown error occurred");
    });

    it("should return default message for undefined", () => {
      expect(getErrorMessage(undefined)).toBe("An unknown error occurred");
    });

    it("should return default message for number", () => {
      expect(getErrorMessage(123)).toBe("An unknown error occurred");
    });

    it("should return default message for empty object", () => {
      expect(getErrorMessage({})).toBe("An unknown error occurred");
    });

    it("should handle object with message: undefined", () => {
      const error = { message: undefined };
      expect(getErrorMessage(error)).toBe("undefined");
    });
  });

  describe("safeLocalStorage", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
      vi.clearAllMocks();
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe("getItem()", () => {
      it("should retrieve and validate JSON data", () => {
        const validator = (value: unknown): value is { name: string } => {
          return (
            typeof value === "object" &&
            value !== null &&
            "name" in value &&
            typeof (value as { name: unknown }).name === "string"
          );
        };

        localStorage.setItem("user", JSON.stringify({ name: "John" }));
        const result = safeLocalStorage.getItem("user", validator);

        expect(result).toEqual({ name: "John" });
      });

      it("should return null for non-existent key", () => {
        const validator = (value: unknown): value is string => typeof value === "string";
        const result = safeLocalStorage.getItem("nonexistent", validator);

        expect(result).toBe(null);
      });

      it("should return null if validation fails", () => {
        const validator = (value: unknown): value is number => typeof value === "number";

        localStorage.setItem("key", JSON.stringify("string value"));
        const result = safeLocalStorage.getItem("key", validator);

        expect(result).toBe(null);
      });

      it("should handle string values without JSON parsing", () => {
        const validator = (value: unknown): value is string => typeof value === "string";

        localStorage.setItem("key", "plain string");
        const result = safeLocalStorage.getItem("key", validator);

        expect(result).toBe("plain string");
      });

      it("should handle arrays", () => {
        const validator = (value: unknown): value is number[] => {
          return Array.isArray(value) && value.every((v) => typeof v === "number");
        };

        localStorage.setItem("numbers", JSON.stringify([1, 2, 3]));
        const result = safeLocalStorage.getItem("numbers", validator);

        expect(result).toEqual([1, 2, 3]);
      });

      it("should return null on localStorage error", () => {
        const validator = (value: unknown): value is string => typeof value === "string";

        // Mock localStorage.getItem to throw error
        const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
          throw new Error("Storage error");
        });

        const result = safeLocalStorage.getItem("key", validator);
        expect(result).toBe(null);

        // Restore the spy
        spy.mockRestore();
      });

      it("should handle malformed JSON gracefully", () => {
        const validator = (value: unknown): value is string => typeof value === "string";

        // Manually set malformed JSON (can't be parsed, so treated as string)
        localStorage.setItem("key", "{invalid json}");
        const result = safeLocalStorage.getItem("key", validator);

        // Should treat as string and validate
        expect(result).toBe("{invalid json}");
      });

      it("should validate complex nested objects", () => {
        type User = {
          id: number;
          profile: { name: string; age: number };
        };

        const validator = (value: unknown): value is User => {
          if (typeof value !== "object" || value === null) return false;
          const v = value as Record<string, unknown>;
          return (
            typeof v.id === "number" &&
            typeof v.profile === "object" &&
            v.profile !== null &&
            typeof (v.profile as Record<string, unknown>).name === "string" &&
            typeof (v.profile as Record<string, unknown>).age === "number"
          );
        };

        const user: User = { id: 1, profile: { name: "Alice", age: 30 } };
        localStorage.setItem("user", JSON.stringify(user));
        const result = safeLocalStorage.getItem("user", validator);

        expect(result).toEqual(user);
      });
    });

    describe("setItem()", () => {
      it("should store string values", () => {
        const result = safeLocalStorage.setItem("key", "value");

        expect(result).toBe(true);
        expect(localStorage.getItem("key")).toBe("value");
      });

      it("should serialize objects to JSON", () => {
        const obj = { name: "John", age: 30 };
        const result = safeLocalStorage.setItem("user", obj);

        expect(result).toBe(true);
        expect(localStorage.getItem("user")).toBe(JSON.stringify(obj));
      });

      it("should serialize arrays to JSON", () => {
        const arr = [1, 2, 3];
        const result = safeLocalStorage.setItem("numbers", arr);

        expect(result).toBe(true);
        expect(localStorage.getItem("numbers")).toBe(JSON.stringify(arr));
      });

      it("should handle boolean values", () => {
        const result = safeLocalStorage.setItem("flag", true);

        expect(result).toBe(true);
        expect(localStorage.getItem("flag")).toBe("true");
      });

      it("should handle null values", () => {
        const result = safeLocalStorage.setItem("key", null);

        expect(result).toBe(true);
        expect(localStorage.getItem("key")).toBe("null");
      });

      it("should return false on error", () => {
        // Mock localStorage.setItem to throw error
        const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
          throw new Error("Quota exceeded");
        });

        const result = safeLocalStorage.setItem("key", "value");
        expect(result).toBe(false);

        // Restore the spy
        spy.mockRestore();
      });

      it("should handle complex nested objects", () => {
        const complex = {
          users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
          meta: { count: 2, updated: "2024-01-15" },
        };

        const result = safeLocalStorage.setItem("data", complex);

        expect(result).toBe(true);
        expect(JSON.parse(localStorage.getItem("data")!)).toEqual(complex);
      });
    });

    describe("removeItem()", () => {
      it("should remove existing item", () => {
        localStorage.setItem("key", "value");
        const result = safeLocalStorage.removeItem("key");

        expect(result).toBe(true);
        expect(localStorage.getItem("key")).toBe(null);
      });

      it("should return true even if key doesn't exist", () => {
        const result = safeLocalStorage.removeItem("nonexistent");
        expect(result).toBe(true);
      });

      it("should return false on error", () => {
        // Mock localStorage.removeItem to throw error
        const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
          throw new Error("Storage error");
        });

        const result = safeLocalStorage.removeItem("key");
        expect(result).toBe(false);

        // Restore the spy
        spy.mockRestore();
      });

      it("should handle multiple removals", () => {
        localStorage.setItem("key1", "value1");
        localStorage.setItem("key2", "value2");
        localStorage.setItem("key3", "value3");

        expect(safeLocalStorage.removeItem("key1")).toBe(true);
        expect(safeLocalStorage.removeItem("key2")).toBe(true);
        expect(safeLocalStorage.removeItem("key3")).toBe(true);

        expect(localStorage.getItem("key1")).toBe(null);
        expect(localStorage.getItem("key2")).toBe(null);
        expect(localStorage.getItem("key3")).toBe(null);
      });
    });

    describe("Integration scenarios", () => {
      it("should handle complete set-get-remove cycle", () => {
        const data = { user: "John", role: "admin" };

        // Set
        const setResult = safeLocalStorage.setItem("session", data);
        expect(setResult).toBe(true);

        // Get
        const validator = (value: unknown): value is typeof data => {
          return (
            typeof value === "object" &&
            value !== null &&
            "user" in value &&
            "role" in value
          );
        };
        const getResult = safeLocalStorage.getItem("session", validator);
        expect(getResult).toEqual(data);

        // Remove
        const removeResult = safeLocalStorage.removeItem("session");
        expect(removeResult).toBe(true);

        // Verify removed
        const finalGet = safeLocalStorage.getItem("session", validator);
        expect(finalGet).toBe(null);
      });

      it("should handle overwriting existing values", () => {
        safeLocalStorage.setItem("counter", 1);
        safeLocalStorage.setItem("counter", 2);
        safeLocalStorage.setItem("counter", 3);

        const validator = (value: unknown): value is number => typeof value === "number";
        const result = safeLocalStorage.getItem("counter", validator);

        expect(result).toBe(3);
      });
    });
  });
});
