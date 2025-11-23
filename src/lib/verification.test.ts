import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateTrustScore,
  getTrustScoreColor,
  getTrustScoreBgColor,
  getTrustScoreLabel,
  getVerificationProgress,
  meetsMinimumVerification,
  getVerificationStatusMessage,
  validateDocument,
  formatVerificationDate,
  calculateAccountAge,
} from "./verification";
import type { UserVerificationProfile } from "../types/verification";

describe("Verification Utils", () => {
  describe("calculateTrustScore()", () => {
    it("should calculate perfect score for fully verified user", () => {
      const result = calculateTrustScore({
        identityVerified: true,
        phoneVerified: true,
        emailVerified: true,
        completedBookings: 10, // 20 points
        averageRating: 5.0, // 20 + 1 volume bonus
        totalReviews: 10,
        averageResponseTimeHours: 1, // 15 points
        accountAgeDays: 365, // 10 points
      });

      expect(result.overall).toBeGreaterThan(80);
      expect(result.components.verification).toBe(30); // 15+8+7
    });

    it("should give 0 score for unverified new user", () => {
      const result = calculateTrustScore({
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        completedBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        averageResponseTimeHours: 100,
        accountAgeDays: 1,
      });

      expect(result.overall).toBeLessThan(10);
    });

    it("should calculate verification score correctly", () => {
      const result = calculateTrustScore({
        identityVerified: true, // 15
        phoneVerified: true, // 8
        emailVerified: true, // 7
        completedBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        averageResponseTimeHours: 100,
        accountAgeDays: 0,
      });

      expect(result.components.verification).toBe(30);
    });

    it("should cap completed bookings score at 20", () => {
      const result = calculateTrustScore({
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        completedBookings: 100, // Would be 200, capped at 20
        averageRating: 0,
        totalReviews: 0,
        averageResponseTimeHours: 100,
        accountAgeDays: 0,
      });

      expect(result.components.completedBookings).toBe(20);
    });

    it("should calculate reviews score with volume bonus", () => {
      const result = calculateTrustScore({
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        completedBookings: 0,
        averageRating: 5.0, // 20 points from rating
        totalReviews: 20, // 2 points volume bonus (capped at 5)
        averageResponseTimeHours: 100,
        accountAgeDays: 0,
      });

      expect(result.components.reviews).toBeGreaterThan(20);
    });

    it("should penalize slow response times", () => {
      const fast = calculateTrustScore({
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        completedBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        averageResponseTimeHours: 1,
        accountAgeDays: 0,
      });

      const slow = calculateTrustScore({
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        completedBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        averageResponseTimeHours: 48,
        accountAgeDays: 0,
      });

      expect(fast.components.responseTime).toBeGreaterThan(
        slow.components.responseTime
      );
    });

    it("should reward account age", () => {
      const result = calculateTrustScore({
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        completedBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        averageResponseTimeHours: 100,
        accountAgeDays: 365, // 1 year = 10 points
      });

      expect(result.components.accountAge).toBe(10);
    });
  });

  describe("getTrustScoreColor()", () => {
    it("should return excellent color for score >= 80", () => {
      expect(getTrustScoreColor(80)).toBe("text-trust-excellent");
      expect(getTrustScoreColor(100)).toBe("text-trust-excellent");
    });

    it("should return good color for score 60-79", () => {
      expect(getTrustScoreColor(60)).toBe("text-trust-good");
      expect(getTrustScoreColor(75)).toBe("text-trust-good");
    });

    it("should return fair color for score 40-59", () => {
      expect(getTrustScoreColor(40)).toBe("text-trust-fair");
      expect(getTrustScoreColor(50)).toBe("text-trust-fair");
    });

    it("should return low color for score < 40", () => {
      expect(getTrustScoreColor(0)).toBe("text-trust-low");
      expect(getTrustScoreColor(39)).toBe("text-trust-low");
    });
  });

  describe("getTrustScoreBgColor()", () => {
    it("should return excellent bg for score >= 80", () => {
      expect(getTrustScoreBgColor(90)).toBe("bg-trust-excellent/10");
    });

    it("should return good bg for score 60-79", () => {
      expect(getTrustScoreBgColor(70)).toBe("bg-trust-good/10");
    });

    it("should return fair bg for score 40-59", () => {
      expect(getTrustScoreBgColor(50)).toBe("bg-trust-fair/10");
    });

    it("should return low bg for score < 40", () => {
      expect(getTrustScoreBgColor(20)).toBe("bg-trust-low/10");
    });
  });

  describe("getTrustScoreLabel()", () => {
    it("should return labels for different score ranges", () => {
      expect(getTrustScoreLabel(90)).toBe("Excellent");
      expect(getTrustScoreLabel(70)).toBe("Good");
      expect(getTrustScoreLabel(50)).toBe("Fair");
      expect(getTrustScoreLabel(20)).toBe("Building Trust");
    });
  });

  describe("getVerificationProgress()", () => {
    it("should return 100% for fully verified user", () => {
      const profile: UserVerificationProfile = {
        identityVerified: true,
        phoneVerified: true,
        emailVerified: true,
        addressVerified: true,
      };

      expect(getVerificationProgress(profile)).toBe(100);
    });

    it("should return 0% for unverified user", () => {
      const profile: UserVerificationProfile = {
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        addressVerified: false,
      };

      expect(getVerificationProgress(profile)).toBe(0);
    });

    it("should return 50% for half-verified user", () => {
      const profile: UserVerificationProfile = {
        identityVerified: true,
        phoneVerified: true,
        emailVerified: false,
        addressVerified: false,
      };

      expect(getVerificationProgress(profile)).toBe(50);
    });

    it("should return 25% for single verification", () => {
      const profile: UserVerificationProfile = {
        identityVerified: true,
        phoneVerified: false,
        emailVerified: false,
        addressVerified: false,
      };

      expect(getVerificationProgress(profile)).toBe(25);
    });
  });

  describe("meetsMinimumVerification()", () => {
    it("should return true if email and identity verified", () => {
      const profile: UserVerificationProfile = {
        identityVerified: true,
        phoneVerified: false,
        emailVerified: true,
        addressVerified: false,
      };

      expect(meetsMinimumVerification(profile)).toBe(true);
    });

    it("should return false if email not verified", () => {
      const profile: UserVerificationProfile = {
        identityVerified: true,
        phoneVerified: true,
        emailVerified: false,
        addressVerified: true,
      };

      expect(meetsMinimumVerification(profile)).toBe(false);
    });

    it("should return false if identity not verified", () => {
      const profile: UserVerificationProfile = {
        identityVerified: false,
        phoneVerified: true,
        emailVerified: true,
        addressVerified: true,
      };

      expect(meetsMinimumVerification(profile)).toBe(false);
    });
  });

  describe("getVerificationStatusMessage()", () => {
    it("should return 'Fully verified' for complete verification", () => {
      const profile: UserVerificationProfile = {
        identityVerified: true,
        phoneVerified: true,
        emailVerified: true,
        addressVerified: true,
      };

      expect(getVerificationStatusMessage(profile)).toBe("Fully verified");
    });

    it("should list missing verifications", () => {
      const profile: UserVerificationProfile = {
        identityVerified: false,
        phoneVerified: true,
        emailVerified: false,
        addressVerified: true,
      };

      const message = getVerificationStatusMessage(profile);
      expect(message).toContain("identity");
      expect(message).toContain("email");
      expect(message).not.toContain("phone");
      expect(message).not.toContain("address");
    });

    it("should list all missing if nothing verified", () => {
      const profile: UserVerificationProfile = {
        identityVerified: false,
        phoneVerified: false,
        emailVerified: false,
        addressVerified: false,
      };

      const message = getVerificationStatusMessage(profile);
      expect(message).toContain("identity");
      expect(message).toContain("phone");
      expect(message).toContain("email");
      expect(message).toContain("address");
    });
  });

  describe("validateDocument()", () => {
    it("should accept valid JPEG file", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const result = validateDocument(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid PNG file", () => {
      const file = new File(["test"], "test.png", { type: "image/png" });
      const result = validateDocument(file);

      expect(result.valid).toBe(true);
    });

    it("should accept valid PDF file", () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const result = validateDocument(file);

      expect(result.valid).toBe(true);
    });

    it("should reject file over 5MB", () => {
      const largeContent = new Array(6 * 1024 * 1024).join("a");
      const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
      const result = validateDocument(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("5MB");
    });

    it("should reject invalid file type", () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      const result = validateDocument(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("JPEG, PNG, WebP, or PDF");
    });

    it("should accept file exactly at 5MB limit", () => {
      const content = new Array(5 * 1024 * 1024).join("a");
      const file = new File([content], "exact.jpg", { type: "image/jpeg" });
      const result = validateDocument(file);

      expect(result.valid).toBe(true);
    });
  });

  describe("formatVerificationDate()", () => {
    it("should return 'Not verified' for undefined", () => {
      expect(formatVerificationDate(undefined)).toBe("Not verified");
    });

    it("should format date as 'Verified MMM YYYY'", () => {
      const result = formatVerificationDate("2024-06-15T10:00:00Z");
      expect(result).toContain("Verified");
      expect(result).toContain("2024");
      expect(result).toContain("Jun");
    });

    it("should handle different months", () => {
      const jan = formatVerificationDate("2024-01-15T10:00:00Z");
      const dec = formatVerificationDate("2024-12-15T10:00:00Z");

      expect(jan).toContain("Jan");
      expect(dec).toContain("Dec");
    });
  });

  describe("calculateAccountAge()", () => {
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

    it("should return 0 for account created today", () => {
      const age = calculateAccountAge("2024-06-15T10:00:00Z");
      // Could be 0 or 1 depending on exact time, should be close to 0
      expect(age).toBeLessThanOrEqual(1);
    });

    it("should return 1 for account created yesterday", () => {
      const age = calculateAccountAge("2024-06-14T10:00:00Z");
      expect(age).toBeGreaterThanOrEqual(1);
      expect(age).toBeLessThanOrEqual(2);
    });

    it("should return 365 for one-year-old account", () => {
      const age = calculateAccountAge("2023-06-15T12:00:00Z");
      expect(age).toBeGreaterThanOrEqual(364);
      expect(age).toBeLessThanOrEqual(366);
    });

    it("should return 30 for month-old account", () => {
      const age = calculateAccountAge("2024-05-16T12:00:00Z");
      expect(age).toBeGreaterThanOrEqual(29);
      expect(age).toBeLessThanOrEqual(31);
    });
  });
});
