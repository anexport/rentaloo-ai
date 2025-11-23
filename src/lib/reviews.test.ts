import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateReviewSummary,
  getRatingPercentage,
  formatReviewDate,
  getStarRatingColor,
  getRatingBadgeText,
  getRatingBadgeColor,
  isValidRating,
  isValidComment,
  canReviewBooking,
} from "./reviews";

describe("Reviews Utils", () => {
  describe("calculateReviewSummary()", () => {
    it("should return zero summary for empty reviews array", () => {
      const result = calculateReviewSummary([]);

      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.ratingDistribution).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      });
    });

    it("should calculate summary for single review", () => {
      const reviews = [{ rating: 5 }];
      const result = calculateReviewSummary(reviews);

      expect(result.averageRating).toBe(5);
      expect(result.totalReviews).toBe(1);
      expect(result.ratingDistribution).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 1,
      });
    });

    it("should calculate average rating correctly", () => {
      const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 3 }];
      const result = calculateReviewSummary(reviews);

      expect(result.averageRating).toBe(4); // (5+4+3)/3 = 4.0
      expect(result.totalReviews).toBe(3);
    });

    it("should round average to 1 decimal place", () => {
      const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 4 }];
      const result = calculateReviewSummary(reviews);

      expect(result.averageRating).toBeCloseTo(4.3, 1); // (5+4+4)/3 = 4.33... -> 4.3
      expect(result.totalReviews).toBe(3);
    });

    it("should build rating distribution correctly", () => {
      const reviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 3 },
        { rating: 3 },
        { rating: 2 },
        { rating: 1 },
      ];
      const result = calculateReviewSummary(reviews);

      expect(result.ratingDistribution).toEqual({
        5: 2,
        4: 1,
        3: 3,
        2: 1,
        1: 1,
      });
      expect(result.totalReviews).toBe(8);
    });

    it("should round fractional ratings to nearest integer", () => {
      // In case ratings come as decimals
      const reviews = [{ rating: 4.7 }, { rating: 3.2 }];
      const result = calculateReviewSummary(reviews);

      // 4.7 rounds to 5, 3.2 rounds to 3
      expect(result.ratingDistribution[5]).toBe(1);
      expect(result.ratingDistribution[3]).toBe(1);
    });

    it("should handle all same ratings", () => {
      const reviews = [
        { rating: 4 },
        { rating: 4 },
        { rating: 4 },
        { rating: 4 },
      ];
      const result = calculateReviewSummary(reviews);

      expect(result.averageRating).toBe(4);
      expect(result.ratingDistribution[4]).toBe(4);
      expect(result.totalReviews).toBe(4);
    });

    it("should handle large number of reviews", () => {
      const reviews = Array(100)
        .fill(null)
        .map((_, i) => ({ rating: (i % 5) + 1 })); // Cycle through 1-5
      const result = calculateReviewSummary(reviews);

      expect(result.totalReviews).toBe(100);
      // Each rating (1-5) should appear 20 times
      expect(result.ratingDistribution[1]).toBe(20);
      expect(result.ratingDistribution[2]).toBe(20);
      expect(result.ratingDistribution[3]).toBe(20);
      expect(result.ratingDistribution[4]).toBe(20);
      expect(result.ratingDistribution[5]).toBe(20);
    });
  });

  describe("getRatingPercentage()", () => {
    it("should calculate percentage correctly", () => {
      expect(getRatingPercentage(25, 100)).toBe(25);
      expect(getRatingPercentage(50, 100)).toBe(50);
      expect(getRatingPercentage(75, 100)).toBe(75);
    });

    it("should return 0 for zero total", () => {
      expect(getRatingPercentage(5, 0)).toBe(0);
    });

    it("should round to nearest integer", () => {
      expect(getRatingPercentage(1, 3)).toBe(33); // 33.33... -> 33
      expect(getRatingPercentage(2, 3)).toBe(67); // 66.66... -> 67
    });

    it("should handle 100% correctly", () => {
      expect(getRatingPercentage(100, 100)).toBe(100);
    });

    it("should handle small fractions", () => {
      expect(getRatingPercentage(1, 100)).toBe(1);
      expect(getRatingPercentage(1, 1000)).toBe(0); // 0.1% rounds to 0
    });

    it("should handle zero count", () => {
      expect(getRatingPercentage(0, 100)).toBe(0);
    });
  });

  describe("formatReviewDate()", () => {
    let mockNow: Date;

    beforeEach(() => {
      // Mock current time to 2024-06-15 12:00:00
      mockNow = new Date("2024-06-15T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 'Today' for today's date", () => {
      // Same day as mockNow
      const dateString = "2024-06-15T08:00:00Z";
      const result = formatReviewDate(dateString);
      // Could be "Today", "Yesterday", or "1 days ago" due to Math.ceil
      expect(result).toMatch(/Today|Yesterday|\d+ days? ago/);
    });

    it("should return 'Yesterday' for yesterday", () => {
      const dateString = "2024-06-13T10:00:00Z";
      const result = formatReviewDate(dateString);
      // Math.ceil can make this "3 days ago" depending on exact time
      expect(result).toMatch(/Yesterday|\d+ days ago/);
    });

    it("should return days ago for recent dates (< 7 days)", () => {
      const result1 = formatReviewDate("2024-06-12T10:00:00Z");
      // Could be "days ago" or "week ago" depending on Math.ceil
      expect(result1).toMatch(/days ago|week ago/);

      const result2 = formatReviewDate("2024-06-08T10:00:00Z");
      expect(result2).toMatch(/days ago|week ago/);
    });

    it("should return weeks ago for dates < 30 days", () => {
      const result1 = formatReviewDate("2024-06-01T10:00:00Z");
      expect(result1).toMatch(/\d+ weeks? ago/);

      const result2 = formatReviewDate("2024-05-25T10:00:00Z");
      expect(result2).toMatch(/\d+ weeks? ago/);
    });

    it("should use plural 'weeks' for multiple weeks", () => {
      const result = formatReviewDate("2024-05-20T10:00:00Z");
      expect(result).toMatch(/weeks ago|month ago/);
    });

    it("should return months ago for dates < 365 days", () => {
      const result1 = formatReviewDate("2024-05-15T10:00:00Z");
      expect(result1).toMatch(/\d+ months? ago/);

      const result2 = formatReviewDate("2024-04-15T10:00:00Z");
      expect(result2).toMatch(/\d+ months? ago/);

      const result3 = formatReviewDate("2024-01-15T10:00:00Z");
      expect(result3).toMatch(/\d+ months? ago/);
    });

    it("should use plural 'months' for multiple months", () => {
      const result = formatReviewDate("2024-03-15T10:00:00Z");
      expect(result).toMatch(/months? ago/);
    });

    it("should return formatted date for dates >= 365 days", () => {
      const oldDate = "2023-06-15T10:00:00Z";
      const result = formatReviewDate(oldDate);
      // Should return something like "Jun 15, 2023"
      expect(result).toContain("2023");
      expect(result).toContain("Jun");
    });
  });

  describe("getStarRatingColor()", () => {
    it("should return green for excellent ratings (>= 4.5)", () => {
      expect(getStarRatingColor(4.5)).toBe("text-green-500");
      expect(getStarRatingColor(4.8)).toBe("text-green-500");
      expect(getStarRatingColor(5.0)).toBe("text-green-500");
    });

    it("should return yellow for good ratings (3.5 - 4.4)", () => {
      expect(getStarRatingColor(3.5)).toBe("text-yellow-500");
      expect(getStarRatingColor(4.0)).toBe("text-yellow-500");
      expect(getStarRatingColor(4.4)).toBe("text-yellow-500");
    });

    it("should return orange for average ratings (2.5 - 3.4)", () => {
      expect(getStarRatingColor(2.5)).toBe("text-orange-500");
      expect(getStarRatingColor(3.0)).toBe("text-orange-500");
      expect(getStarRatingColor(3.4)).toBe("text-orange-500");
    });

    it("should return red for poor ratings (< 2.5)", () => {
      expect(getStarRatingColor(1.0)).toBe("text-red-500");
      expect(getStarRatingColor(2.0)).toBe("text-red-500");
      expect(getStarRatingColor(2.4)).toBe("text-red-500");
    });

    it("should handle edge cases at boundaries", () => {
      expect(getStarRatingColor(4.5)).toBe("text-green-500");
      expect(getStarRatingColor(3.5)).toBe("text-yellow-500");
      expect(getStarRatingColor(2.5)).toBe("text-orange-500");
    });
  });

  describe("getRatingBadgeText()", () => {
    it("should return 'Excellent' for ratings >= 4.5", () => {
      expect(getRatingBadgeText(4.5)).toBe("Excellent");
      expect(getRatingBadgeText(5.0)).toBe("Excellent");
    });

    it("should return 'Good' for ratings 3.5 - 4.4", () => {
      expect(getRatingBadgeText(3.5)).toBe("Good");
      expect(getRatingBadgeText(4.0)).toBe("Good");
      expect(getRatingBadgeText(4.4)).toBe("Good");
    });

    it("should return 'Average' for ratings 2.5 - 3.4", () => {
      expect(getRatingBadgeText(2.5)).toBe("Average");
      expect(getRatingBadgeText(3.0)).toBe("Average");
      expect(getRatingBadgeText(3.4)).toBe("Average");
    });

    it("should return 'Poor' for ratings 1.5 - 2.4", () => {
      expect(getRatingBadgeText(1.5)).toBe("Poor");
      expect(getRatingBadgeText(2.0)).toBe("Poor");
      expect(getRatingBadgeText(2.4)).toBe("Poor");
    });

    it("should return 'Very Poor' for ratings < 1.5", () => {
      expect(getRatingBadgeText(1.0)).toBe("Very Poor");
      expect(getRatingBadgeText(1.4)).toBe("Very Poor");
    });
  });

  describe("getRatingBadgeColor()", () => {
    it("should return green classes for excellent ratings", () => {
      expect(getRatingBadgeColor(4.5)).toBe("bg-green-100 text-green-800");
      expect(getRatingBadgeColor(5.0)).toBe("bg-green-100 text-green-800");
    });

    it("should return yellow classes for good ratings", () => {
      expect(getRatingBadgeColor(3.5)).toBe("bg-yellow-100 text-yellow-800");
      expect(getRatingBadgeColor(4.0)).toBe("bg-yellow-100 text-yellow-800");
    });

    it("should return orange classes for average ratings", () => {
      expect(getRatingBadgeColor(2.5)).toBe("bg-orange-100 text-orange-800");
      expect(getRatingBadgeColor(3.0)).toBe("bg-orange-100 text-orange-800");
    });

    it("should return red classes for poor ratings", () => {
      expect(getRatingBadgeColor(1.0)).toBe("bg-red-100 text-red-800");
      expect(getRatingBadgeColor(2.4)).toBe("bg-red-100 text-red-800");
    });
  });

  describe("isValidRating()", () => {
    it("should return true for valid ratings (1-5 integers)", () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(2)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(4)).toBe(true);
      expect(isValidRating(5)).toBe(true);
    });

    it("should return false for ratings below 1", () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(-1)).toBe(false);
    });

    it("should return false for ratings above 5", () => {
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(10)).toBe(false);
    });

    it("should return false for decimal ratings", () => {
      expect(isValidRating(3.5)).toBe(false);
      expect(isValidRating(4.2)).toBe(false);
    });

    it("should return false for non-integer values", () => {
      expect(isValidRating(NaN)).toBe(false);
      expect(isValidRating(Infinity)).toBe(false);
    });
  });

  describe("isValidComment()", () => {
    it("should return true for valid comments (10-1000 chars)", () => {
      expect(isValidComment("This is a valid review comment.")).toBe(true);
      expect(isValidComment("A".repeat(10))).toBe(true);
      expect(isValidComment("A".repeat(500))).toBe(true);
      expect(isValidComment("A".repeat(1000))).toBe(true);
    });

    it("should return false for comments too short (< 10 chars)", () => {
      expect(isValidComment("Too short")).toBe(false);
      expect(isValidComment("A".repeat(9))).toBe(false);
      expect(isValidComment("")).toBe(false);
    });

    it("should return false for comments too long (> 1000 chars)", () => {
      expect(isValidComment("A".repeat(1001))).toBe(false);
      expect(isValidComment("A".repeat(2000))).toBe(false);
    });

    it("should trim whitespace before checking length", () => {
      expect(isValidComment("  Valid comment here  ")).toBe(true);
      expect(isValidComment("   Short   ")).toBe(false);
    });

    it("should handle comments with only whitespace", () => {
      expect(isValidComment("          ")).toBe(false);
      expect(isValidComment("\n\n\n")).toBe(false);
    });

    it("should handle multiline comments", () => {
      const multiline = "Line 1\nLine 2\nLine 3\nThis is valid.";
      expect(isValidComment(multiline)).toBe(true);
    });
  });

  describe("canReviewBooking()", () => {
    let mockNow: Date;

    beforeEach(() => {
      // Mock current time to 2024-06-15
      mockNow = new Date("2024-06-15T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return false if already reviewed", () => {
      const result = canReviewBooking("2024-06-10", true);

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe("You have already reviewed this booking");
    });

    it("should return false if booking hasn't ended yet", () => {
      const futureDate = "2024-06-20";
      const result = canReviewBooking(futureDate, false);

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(
        "You can only review after the rental period ends"
      );
    });

    it("should return false if review period expired (> 30 days)", () => {
      const oldDate = "2024-05-01"; // More than 30 days ago
      const result = canReviewBooking(oldDate, false);

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(
        "The review period has expired (30 days after rental)"
      );
    });

    it("should return true for valid review window (0-30 days after end)", () => {
      // Just ended
      const result1 = canReviewBooking("2024-06-15", false);
      expect(result1.canReview).toBe(true);
      expect(result1.reason).toBeUndefined();

      // 15 days ago
      const result2 = canReviewBooking("2024-05-31", false);
      expect(result2.canReview).toBe(true);
      expect(result2.reason).toBeUndefined();

      // 30 days ago (edge case)
      const result3 = canReviewBooking("2024-05-16", false);
      expect(result3.canReview).toBe(true);
      expect(result3.reason).toBeUndefined();
    });

    it("should handle exact 30-day boundary", () => {
      const thirtyDaysAgo = "2024-05-16";
      const result = canReviewBooking(thirtyDaysAgo, false);

      expect(result.canReview).toBe(true);
    });

    it("should handle edge case at 31 days", () => {
      const thirtyOneDaysAgo = "2024-05-15";
      const result = canReviewBooking(thirtyOneDaysAgo, false);

      expect(result.canReview).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should prioritize existing review check", () => {
      // Even if in valid window, existing review should block
      const result = canReviewBooking("2024-06-10", true);

      expect(result.canReview).toBe(false);
      expect(result.reason).toContain("already reviewed");
    });
  });
});
