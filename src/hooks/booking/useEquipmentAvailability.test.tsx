import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEquipmentAvailability } from "./useEquipmentAvailability";
import { mockSupabaseFrom, resetSupabaseMocks } from "@/__tests__/mocks/supabase";

describe("useEquipmentAvailability", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("Initialization", () => {
    it("should start with empty availability and loading false when disabled", () => {
      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: false,
        })
      );

      expect(result.current.availability.size).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should start loading when enabled with equipment ID", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should not fetch when no equipment ID provided", () => {
      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: undefined,
          enabled: true,
        })
      );

      expect(result.current.loading).toBe(false);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe("Fetching Availability", () => {
    it("should fetch availability data successfully", async () => {
      const mockData = [
        {
          equipment_id: "equipment-1",
          date: "2024-06-15",
          is_available: true,
          custom_rate: null,
        },
        {
          equipment_id: "equipment-1",
          date: "2024-06-16",
          is_available: true,
          custom_rate: 150,
        },
        {
          equipment_id: "equipment-1",
          date: "2024-06-17",
          is_available: false,
          custom_rate: null,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availability.size).toBe(3);
      expect(result.current.availability.get("2024-06-15")).toEqual({
        date: "2024-06-15",
        isAvailable: true,
        customRate: null,
      });
      expect(result.current.availability.get("2024-06-16")).toEqual({
        date: "2024-06-16",
        isAvailable: true,
        customRate: 150,
      });
      expect(result.current.availability.get("2024-06-17")).toEqual({
        date: "2024-06-17",
        isAvailable: false,
        customRate: null,
      });
    });

    it("should handle fetch error", async () => {
      const mockError = new Error("Database error");

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Database error");
      expect(result.current.availability.size).toBe(0);
    });

    it("should handle empty availability data", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availability.size).toBe(0);
      expect(result.current.error).toBe(null);
    });

    it("should fetch availability for next 6 months", async () => {
      let capturedGte: string | undefined;
      let capturedLte: string | undefined;

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn((field, value) => {
          if (field === "date") capturedGte = value;
          return {
            lte: vi.fn((field, value) => {
              if (field === "date") capturedLte = value;
              return Promise.resolve({ data: [], error: null });
            }),
          };
        }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(capturedGte).toBeDefined();
      expect(capturedLte).toBeDefined();

      // Verify the dates are roughly 6 months apart
      if (capturedGte && capturedLte) {
        const startDate = new Date(capturedGte);
        const endDate = new Date(capturedLte);
        const monthDiff =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());

        expect(monthDiff).toBe(6);
      }
    });
  });

  describe("getAvailabilityForDate", () => {
    it("should return availability for a specific date", async () => {
      const mockData = [
        {
          equipment_id: "equipment-1",
          date: "2024-06-15",
          is_available: true,
          custom_rate: 150,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const availability = result.current.getAvailabilityForDate(
        new Date("2024-06-15")
      );

      expect(availability).toEqual({
        date: "2024-06-15",
        isAvailable: true,
        customRate: 150,
      });
    });

    it("should return undefined for date without availability record", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const availability = result.current.getAvailabilityForDate(
        new Date("2024-06-15")
      );

      expect(availability).toBeUndefined();
    });
  });

  describe("isDateAvailable", () => {
    it("should return true for available date", async () => {
      const mockData = [
        {
          equipment_id: "equipment-1",
          date: "2024-06-15",
          is_available: true,
          custom_rate: null,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const isAvailable = result.current.isDateAvailable(
        new Date("2024-06-15")
      );

      expect(isAvailable).toBe(true);
    });

    it("should return false for unavailable date", async () => {
      const mockData = [
        {
          equipment_id: "equipment-1",
          date: "2024-06-15",
          is_available: false,
          custom_rate: null,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const isAvailable = result.current.isDateAvailable(
        new Date("2024-06-15")
      );

      expect(isAvailable).toBe(false);
    });

    it("should return true (default) for date without record", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const isAvailable = result.current.isDateAvailable(
        new Date("2024-06-15")
      );

      // Should default to available when no record exists
      expect(isAvailable).toBe(true);
    });
  });

  describe("refetch", () => {
    it("should refetch availability data", async () => {
      const mockData = [
        {
          equipment_id: "equipment-1",
          date: "2024-06-15",
          is_available: true,
          custom_rate: null,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() =>
        useEquipmentAvailability({
          equipmentId: "equipment-1",
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availability.size).toBe(1);

      // Clear previous mock
      resetSupabaseMocks();

      const newMockData = [
        {
          equipment_id: "equipment-1",
          date: "2024-06-15",
          is_available: false,
          custom_rate: 200,
        },
        {
          equipment_id: "equipment-1",
          date: "2024-06-16",
          is_available: true,
          custom_rate: null,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: newMockData, error: null }),
      });

      // Trigger refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.availability.size).toBe(2);
      });

      expect(result.current.availability.get("2024-06-15")?.isAvailable).toBe(false);
      expect(result.current.availability.get("2024-06-15")?.customRate).toBe(200);
    });
  });
});
