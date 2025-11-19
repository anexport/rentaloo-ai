import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateBookingTotal,
  checkBookingConflictsSync,
  formatBookingDate,
  formatBookingDuration,
  getBookingStatusColor,
  getBookingStatusText,
} from "./booking";
import { mockAvailabilitySlots, mockExistingBookings } from "@/__tests__/mocks/bookingFixtures";

describe("Booking Calculations", () => {
  describe("calculateBookingTotal", () => {
    it("should calculate total for single day booking", () => {
      const result = calculateBookingTotal(
        100,
        "2024-06-15",
        "2024-06-16"
      );

      expect(result.days).toBe(1);
      expect(result.daily_rate).toBe(100);
      expect(result.subtotal).toBe(100);
      expect(result.fees).toBe(5); // 5% of 100
      expect(result.total).toBe(105);
      expect(result.currency).toBe("USD");
    });

    it("should calculate total for multi-day booking", () => {
      const result = calculateBookingTotal(
        100,
        "2024-06-15",
        "2024-06-20"
      );

      expect(result.days).toBe(5);
      expect(result.daily_rate).toBe(100);
      expect(result.subtotal).toBe(500);
      expect(result.fees).toBe(25); // 5% of 500
      expect(result.total).toBe(525);
    });

    it("should calculate total for week-long booking", () => {
      const result = calculateBookingTotal(
        75,
        "2024-06-01",
        "2024-06-08"
      );

      expect(result.days).toBe(7);
      expect(result.daily_rate).toBe(75);
      expect(result.subtotal).toBe(525);
      expect(result.fees).toBe(26.25); // 5% of 525
      expect(result.total).toBe(551.25);
    });

    it("should handle custom rates when provided", () => {
      const customRates = [
        { date: "2024-06-15", is_available: true, custom_rate: 150 },
        { date: "2024-06-16", is_available: true, custom_rate: 150 },
        { date: "2024-06-17", is_available: true, custom_rate: 150 },
      ];

      const result = calculateBookingTotal(
        100,
        "2024-06-15",
        "2024-06-18",
        customRates
      );

      expect(result.days).toBe(3);
      expect(result.subtotal).toBe(450); // 150 * 3
      expect(result.fees).toBe(22.5); // 5% of 450
      expect(result.total).toBe(472.5);
    });

    it("should mix custom rates with default rate", () => {
      const customRates = [
        { date: "2024-06-15", is_available: true, custom_rate: 150 },
        // 2024-06-16 will use default rate
        { date: "2024-06-17", is_available: true, custom_rate: 150 },
      ];

      const result = calculateBookingTotal(
        100,
        "2024-06-15",
        "2024-06-18",
        customRates
      );

      expect(result.days).toBe(3);
      expect(result.subtotal).toBe(400); // 150 + 100 + 150
      expect(result.fees).toBe(20); // 5% of 400
      expect(result.total).toBe(420);
    });

    it("should handle decimal daily rates", () => {
      const result = calculateBookingTotal(
        75.50,
        "2024-06-15",
        "2024-06-17"
      );

      expect(result.days).toBe(2);
      expect(result.subtotal).toBe(151);
      expect(result.fees).toBeCloseTo(7.55, 2); // 5% of 151
      expect(result.total).toBeCloseTo(158.55, 2);
    });

    it("should handle same start and end date (0 days)", () => {
      const result = calculateBookingTotal(
        100,
        "2024-06-15",
        "2024-06-15"
      );

      expect(result.days).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.fees).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("checkBookingConflictsSync", () => {
    it("should return no conflicts for valid booking", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-06",
        "2024-06-09",
        mockExistingBookings
      );

      expect(conflicts).toHaveLength(0);
    });

    it("should detect overlap at start of existing booking", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-04",
        "2024-06-07",
        mockExistingBookings
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap");
      expect(conflicts[0].message).toBe("Selected dates overlap with existing bookings");
    });

    it("should detect overlap at end of existing booking", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-13",
        "2024-06-17",
        mockExistingBookings
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap");
    });

    it("should detect booking completely within existing booking", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-02",
        "2024-06-04",
        mockExistingBookings
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap");
    });

    it("should detect booking that encompasses existing booking", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-05-30",
        "2024-06-07",
        mockExistingBookings
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap");
    });

    it("should detect minimum rental period violation (< 1 day)", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-15",
        "2024-06-15",
        []
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("minimum_days");
      expect(conflicts[0].message).toBe("Minimum rental period is 1 day");
    });

    it("should detect maximum rental period violation (> 30 days)", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-01",
        "2024-07-15",
        []
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("maximum_days");
      expect(conflicts[0].message).toBe("Maximum rental period is 30 days");
    });

    it("should return multiple conflicts if applicable", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-01",
        "2024-07-15",
        mockExistingBookings
      );

      // Should have both maximum_days and overlap conflicts
      expect(conflicts.length).toBeGreaterThanOrEqual(2);
      expect(conflicts.some(c => c.type === "maximum_days")).toBe(true);
      expect(conflicts.some(c => c.type === "overlap")).toBe(true);
    });

    it("should handle exact matching dates as overlap", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-10",
        "2024-06-15",
        mockExistingBookings
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap");
    });

    it("should detect booking that overlaps at start point", () => {
      const bookings = [
        { start_date: "2024-06-10", end_date: "2024-06-15", status: "approved" },
      ];

      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-05",
        "2024-06-11",
        bookings
      );

      // This should conflict since it overlaps with the start
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap");
    });

    it("should handle empty existing bookings array", () => {
      const conflicts = checkBookingConflictsSync(
        "equipment-1",
        "2024-06-15",
        "2024-06-20",
        []
      );

      expect(conflicts).toHaveLength(0);
    });
  });

  describe("formatBookingDate", () => {
    it("should format date in readable format", () => {
      const formatted = formatBookingDate("2024-06-15");

      // Format should be like "Sat, Jun 15, 2024"
      expect(formatted).toMatch(/\w{3}, \w{3} \d{1,2}, \d{4}/);
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("should handle different months", () => {
      const formatted = formatBookingDate("2024-12-25");

      expect(formatted).toContain("Dec");
      expect(formatted).toContain("25");
    });
  });

  describe("formatBookingDuration", () => {
    it("should format single day", () => {
      const duration = formatBookingDuration("2024-06-15", "2024-06-16");
      expect(duration).toBe("1 day");
    });

    it("should format multiple days", () => {
      const duration = formatBookingDuration("2024-06-15", "2024-06-20");
      expect(duration).toBe("5 days");
    });

    it("should format one week", () => {
      const duration = formatBookingDuration("2024-06-01", "2024-06-08");
      expect(duration).toBe("1 week");
    });

    it("should format multiple weeks", () => {
      const duration = formatBookingDuration("2024-06-01", "2024-06-15");
      expect(duration).toBe("2 weeks");
    });

    it("should format weeks and days", () => {
      const duration = formatBookingDuration("2024-06-01", "2024-06-10");
      expect(duration).toBe("1 week 2 days");
    });

    it("should format multiple weeks and days", () => {
      const duration = formatBookingDuration("2024-06-01", "2024-06-20");
      expect(duration).toBe("2 weeks 5 days");
    });

    it("should handle exactly 4 days", () => {
      const duration = formatBookingDuration("2024-06-01", "2024-06-05");
      expect(duration).toBe("4 days");
    });
  });

  describe("getBookingStatusColor", () => {
    it("should return yellow for pending", () => {
      const color = getBookingStatusColor("pending");
      expect(color).toBe("bg-yellow-100 text-yellow-800");
    });

    it("should return green for approved", () => {
      const color = getBookingStatusColor("approved");
      expect(color).toBe("bg-green-100 text-green-800");
    });

    it("should return gray for cancelled", () => {
      const color = getBookingStatusColor("cancelled");
      expect(color).toBe("bg-gray-100 text-gray-800");
    });

    it("should return blue for completed", () => {
      const color = getBookingStatusColor("completed");
      expect(color).toBe("bg-blue-100 text-blue-800");
    });

    it("should return gray for unknown status", () => {
      const color = getBookingStatusColor("unknown");
      expect(color).toBe("bg-gray-100 text-gray-800");
    });
  });

  describe("getBookingStatusText", () => {
    it("should return 'Awaiting Payment' for pending", () => {
      const text = getBookingStatusText("pending");
      expect(text).toBe("Awaiting Payment");
    });

    it("should return 'Confirmed' for approved", () => {
      const text = getBookingStatusText("approved");
      expect(text).toBe("Confirmed");
    });

    it("should return 'Cancelled' for cancelled", () => {
      const text = getBookingStatusText("cancelled");
      expect(text).toBe("Cancelled");
    });

    it("should return 'Completed' for completed", () => {
      const text = getBookingStatusText("completed");
      expect(text).toBe("Completed");
    });

    it("should return 'Unknown' for unrecognized status", () => {
      const text = getBookingStatusText("weird-status");
      expect(text).toBe("Unknown");
    });
  });
});
