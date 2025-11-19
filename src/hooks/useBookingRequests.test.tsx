import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBookingRequests } from "./useBookingRequests";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import {
  mockRenterUser,
  mockOwnerUser,
  mockRenterSession,
  mockOwnerSession,
} from "@/__tests__/mocks/fixtures";
import {
  mockPendingBookingRequest,
  mockApprovedBookingRequest,
  mockCompletedBookingRequest,
  mockEquipment,
  mockCategory,
  mockRenterProfile,
  mockOwnerProfile,
} from "@/__tests__/mocks/bookingFixtures";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useBookingRequests", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("Initialization", () => {
    it("should start with loading true and empty bookings", () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.bookingRequests).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it("should not fetch when user is not authenticated", async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      // Hook won't fetch without a user, so loading stays true
      // This is expected behavior based on the hook implementation
      expect(result.current.loading).toBe(true);
      expect(result.current.bookingRequests).toEqual([]);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe("Renter Role", () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockRenterSession },
        error: null,
      });
    });

    it("should fetch booking requests for renter", async () => {
      const mockData = [
        {
          ...mockPendingBookingRequest,
          equipment: {
            ...mockEquipment,
            category: mockCategory,
            owner: mockOwnerProfile,
          },
          renter: mockRenterProfile,
        },
        {
          ...mockApprovedBookingRequest,
          equipment: {
            ...mockEquipment,
            category: mockCategory,
            owner: mockOwnerProfile,
          },
          renter: mockRenterProfile,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookingRequests).toHaveLength(2);
      expect(result.current.bookingRequests[0].status).toBe("pending");
      expect(result.current.bookingRequests[1].status).toBe("approved");
      expect(result.current.error).toBe(null);
    });

    it("should filter by renter_id", async () => {
      let capturedRenterId: string | undefined;

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((field, value) => {
          if (field === "renter_id") capturedRenterId = value;
          return {
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(capturedRenterId).toBe(mockRenterUser.id);
    });

    it("should handle fetch error", async () => {
      const mockError = new Error("Database error");

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe("Database error");
      expect(result.current.bookingRequests).toEqual([]);
    });

    it("should handle empty booking list", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookingRequests).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });

  describe("Owner Role", () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockOwnerSession },
        error: null,
      });
    });

    it("should fetch equipment IDs first for owner", async () => {
      const mockEquipmentData = [
        { id: "equipment-1" },
        { id: "equipment-2" },
      ];

      let equipmentFetchCalled = false;
      let bookingsFetchCalled = false;

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "equipment") {
          equipmentFetchCalled = true;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockEquipmentData,
              error: null,
            }),
          };
        } else if (table === "booking_requests") {
          bookingsFetchCalled = true;
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useBookingRequests("owner"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(equipmentFetchCalled).toBe(true);
      expect(bookingsFetchCalled).toBe(true);
    });

    it("should return empty array when owner has no equipment", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "equipment") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useBookingRequests("owner"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookingRequests).toEqual([]);
    });

    it("should fetch bookings for owner equipment", async () => {
      const mockEquipmentData = [{ id: "equipment-1" }];
      const mockBookingsData = [
        {
          ...mockPendingBookingRequest,
          equipment: {
            ...mockEquipment,
            category: mockCategory,
            owner: mockOwnerProfile,
          },
          renter: mockRenterProfile,
        },
      ];

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "equipment") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockEquipmentData,
              error: null,
            }),
          };
        } else if (table === "booking_requests") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockBookingsData,
              error: null,
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useBookingRequests("owner"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookingRequests).toHaveLength(1);
      expect(result.current.bookingRequests[0].equipment_id).toBe("equipment-1");
    });
  });

  describe("createBookingRequest", () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockRenterSession },
        error: null,
      });
    });

    it("should create booking request successfully", async () => {
      const newBookingData = {
        equipment_id: "equipment-1",
        start_date: "2024-06-15",
        end_date: "2024-06-20",
        total_amount: 525,
        message: "Need for weekend event",
      };

      // Mock initial fetch
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock the insert operation
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...newBookingData, id: "new-booking-id" },
        error: null,
      });

      mockSupabaseFrom
        .mockReturnValueOnce({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        })
        // Mock the refetch
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

      const createdBooking = await result.current.createBookingRequest(
        newBookingData
      );

      expect(createdBooking).toBeDefined();
      expect(mockInsert).toHaveBeenCalledWith({
        ...newBookingData,
        renter_id: mockRenterUser.id,
        status: "pending",
      });
    });

    it("should throw error when user is not authenticated", async () => {
      // Start with authenticated user to initialize the hook
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockRenterSession },
        error: null,
      });

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now simulate user being logged out by mocking the user as null
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Directly call the function without user in the context
      // The hook still has the old user, so we need to test the function logic
      // Since we can't easily change the user mid-test, just test with a new instance
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result: resultNoAuth } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      // The hook won't have a user, so createBookingRequest should fail
      await expect(
        resultNoAuth.current.createBookingRequest({
          equipment_id: "equipment-1",
          start_date: "2024-06-15",
          end_date: "2024-06-20",
          total_amount: 525,
        })
      ).rejects.toThrow("User not authenticated");
    });

    it("should handle creation error", async () => {
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockError = new Error("Insert failed");

      mockSupabaseFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      await expect(
        result.current.createBookingRequest({
          equipment_id: "equipment-1",
          start_date: "2024-06-15",
          end_date: "2024-06-20",
          total_amount: 525,
        })
      ).rejects.toThrow();
    });
  });

  describe("updateBookingStatus", () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockOwnerSession },
        error: null,
      });
    });

    it("should update booking status successfully", async () => {
      // Mock initial fetch for owner
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "equipment-1" }],
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

      const { result } = renderHook(() => useBookingRequests("owner"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      // Mock the update operation
      mockSupabaseFrom
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        })
        // Mock refetch for owner
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "equipment-1" }],
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

      await result.current.updateBookingStatus("booking-1", "approved");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
        })
      );
      expect(mockEq).toHaveBeenCalledWith("id", "booking-1");
    });

    it("should handle update error", async () => {
      // Mock initial fetch
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "equipment-1" }],
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

      const { result } = renderHook(() => useBookingRequests("owner"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockError = new Error("Update failed");

      mockSupabaseFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      });

      await expect(
        result.current.updateBookingStatus("booking-1", "approved")
      ).rejects.toThrow();
    });
  });

  describe("getBookingStats", () => {
    beforeEach(() => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockRenterSession },
        error: null,
      });
    });

    it("should calculate booking stats correctly", async () => {
      const mockData = [
        {
          ...mockPendingBookingRequest,
          equipment: {
            ...mockEquipment,
            category: mockCategory,
            owner: mockOwnerProfile,
          },
          renter: mockRenterProfile,
        },
        {
          ...mockApprovedBookingRequest,
          equipment: {
            ...mockEquipment,
            category: mockCategory,
            owner: mockOwnerProfile,
          },
          renter: mockRenterProfile,
        },
        {
          ...mockCompletedBookingRequest,
          equipment: {
            ...mockEquipment,
            category: mockCategory,
            owner: mockOwnerProfile,
          },
          renter: mockRenterProfile,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.getBookingStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.cancelled).toBe(0);
    });

    it("should return zero stats for empty bookings", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useBookingRequests("renter"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.getBookingStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.cancelled).toBe(0);
    });
  });
});
