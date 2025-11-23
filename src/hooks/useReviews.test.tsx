import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useReviews } from "./useReviews";
import { mockSupabaseAuth, mockSupabaseFrom } from "@/__tests__/mocks/supabase";

// Mock review data
const mockReviews = [
  {
    id: "review-1",
    booking_id: "booking-1",
    reviewer_id: "user-1",
    reviewee_id: "user-2",
    rating: 5,
    comment: "Excellent experience! Highly recommend.",
    photos: null,
    created_at: "2024-06-01T10:00:00Z",
    updated_at: "2024-06-01T10:00:00Z",
    reviewer: { id: "user-1", email: "reviewer@example.com" },
    reviewee: { id: "user-2", email: "reviewee@example.com" },
    booking: {
      id: "booking-1",
      booking_request: {
        equipment: {
          id: "eq-1",
          title: "Professional Camera",
        },
      },
    },
  },
  {
    id: "review-2",
    booking_id: "booking-2",
    reviewer_id: "user-3",
    reviewee_id: "user-2",
    rating: 4,
    comment: "Good service, would use again.",
    photos: null,
    created_at: "2024-05-15T10:00:00Z",
    updated_at: "2024-05-15T10:00:00Z",
    reviewer: { id: "user-3", email: "another@example.com" },
    reviewee: { id: "user-2", email: "reviewee@example.com" },
    booking: {
      id: "booking-2",
      booking_request: {
        equipment: {
          id: "eq-2",
          title: "Mountain Bike",
        },
      },
    },
  },
];

describe("useReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default behavior
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
        eq: vi.fn().mockReturnThis(),
      }),
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });
  });

  describe("Initialization", () => {
    it("should start with loading true", () => {
      const { result } = renderHook(() => useReviews());

      expect(result.current.loading).toBe(true);
      expect(result.current.reviews).toEqual([]);
      expect(result.current.summary).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it("should fetch reviews on mount", async () => {
      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reviews).toHaveLength(2);
      expect(result.current.summary).toBeTruthy();
      expect(result.current.error).toBe(null);
    });
  });

  describe("Fetch Reviews", () => {
    it("should fetch all reviews without filters", async () => {
      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith("reviews");
      expect(result.current.reviews).toHaveLength(2);
    });

    it("should filter by revieweeId", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockReviews[0]],
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseFrom.mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        useReviews({ revieweeId: "user-2" })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify eq was called with revieweeId
      expect(mockQuery.select().order().eq).toHaveBeenCalledWith(
        "reviewee_id",
        "user-2"
      );
    });

    it("should filter by reviewerId", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockReviews[0]],
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseFrom.mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        useReviews({ reviewerId: "user-1" })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockQuery.select().order().eq).toHaveBeenCalledWith(
        "reviewer_id",
        "user-1"
      );
    });

    it("should filter by bookingId", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockReviews[0]],
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseFrom.mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        useReviews({ bookingId: "booking-1" })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockQuery.select().order().eq).toHaveBeenCalledWith(
        "booking_id",
        "booking-1"
      );
    });

    it("should order by created_at descending", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      };
      mockSupabaseFrom.mockReturnValue(mockQuery);

      renderHook(() => useReviews());

      await waitFor(() => {
        expect(mockOrder).toHaveBeenCalledWith("created_at", {
          ascending: false,
        });
      });
    });

    it("should handle fetch errors", async () => {
      const errorMessage = "Database connection failed";
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error(errorMessage),
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.reviews).toEqual([]);
    });

    it("should handle empty results", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reviews).toEqual([]);
      expect(result.current.summary?.totalReviews).toBe(0);
    });
  });

  describe("Review Summary", () => {
    it("should calculate summary from fetched reviews", async () => {
      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.summary).toBeTruthy();
      expect(result.current.summary?.totalReviews).toBe(2);
      expect(result.current.summary?.averageRating).toBeCloseTo(4.5, 1); // (5+4)/2
      expect(result.current.summary?.ratingDistribution[5]).toBe(1);
      expect(result.current.summary?.ratingDistribution[4]).toBe(1);
    });

    it("should update summary when reviews change", async () => {
      const { result, rerender } = renderHook(
        ({ options }) => useReviews(options),
        {
          initialProps: { options: {} },
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialTotal = result.current.summary?.totalReviews;
      expect(initialTotal).toBe(2);

      // Change filter to return different results
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockReviews[0]],
              error: null,
            }),
          }),
        }),
      });

      rerender({ options: { revieweeId: "user-2" } });

      await waitFor(() => {
        expect(result.current.summary?.totalReviews).toBe(1);
      });
    });
  });

  describe("submitReview()", () => {
    it("should submit review successfully", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "user@example.com",
          },
        },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const reviewData = {
        bookingId: "booking-1",
        revieweeId: "user-2",
        rating: 5,
        comment: "Great experience!",
      };

      const response = await result.current.submitReview(reviewData);

      expect(response.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith({
        booking_id: "booking-1",
        reviewer_id: "user-1",
        reviewee_id: "user-2",
        rating: 5,
        comment: "Great experience!",
        photos: null,
      });
    });

    it("should include photos if provided", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: { id: "user-1", email: "user@example.com" },
        },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const reviewData = {
        bookingId: "booking-1",
        revieweeId: "user-2",
        rating: 5,
        comment: "Great experience!",
        photos: ["photo1.jpg", "photo2.jpg"],
      };

      await result.current.submitReview(reviewData);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: ["photo1.jpg", "photo2.jpg"],
        })
      );
    });

    it("should return error if user not authenticated", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.submitReview({
        bookingId: "booking-1",
        revieweeId: "user-2",
        rating: 5,
        comment: "Great experience!",
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("not authenticated");
    });

    it("should handle submission errors", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: { id: "user-1", email: "user@example.com" },
        },
        error: null,
      });

      const errorMessage = "Insert failed";
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: new Error(errorMessage),
        }),
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.submitReview({
        bookingId: "booking-1",
        revieweeId: "user-2",
        rating: 5,
        comment: "Great experience!",
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
    });

    it("should refresh reviews after successful submission", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: { id: "user-1", email: "user@example.com" },
        },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        select: mockSelect,
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the initial fetch call
      mockSelect.mockClear();

      await result.current.submitReview({
        bookingId: "booking-1",
        revieweeId: "user-2",
        rating: 5,
        comment: "Great experience!",
      });

      // Should have called select again to refresh
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe("checkIfUserReviewed()", () => {
    it("should return true if user has reviewed", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "review-1" },
                error: null,
              }),
            }),
          }),
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const hasReviewed = await result.current.checkIfUserReviewed(
        "booking-1",
        "user-1"
      );

      expect(hasReviewed).toBe(true);
    });

    it("should return false if user has not reviewed", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" }, // Not found error code
              }),
            }),
          }),
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const hasReviewed = await result.current.checkIfUserReviewed(
        "booking-1",
        "user-1"
      );

      expect(hasReviewed).toBe(false);
    });

    it("should return false on error", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Database error"),
              }),
            }),
          }),
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const hasReviewed = await result.current.checkIfUserReviewed(
        "booking-1",
        "user-1"
      );

      expect(hasReviewed).toBe(false);
    });

    it("should query with correct parameters", async () => {
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
          order: vi.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.checkIfUserReviewed("booking-123", "user-456");

      expect(mockEq).toHaveBeenCalledWith("booking_id", "booking-123");
      expect(mockEq().eq).toHaveBeenCalledWith("reviewer_id", "user-456");
    });
  });

  describe("Data Processing", () => {
    it("should process review data to match ReviewWithDetails type", async () => {
      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const review = result.current.reviews[0];
      expect(review.booking).toBeDefined();
      expect(review.booking.id).toBe("booking-1");
      expect(review.booking.equipment).toBeDefined();
      expect(review.booking.equipment.id).toBe("eq-1");
      expect(review.booking.equipment.title).toBe("Professional Camera");
    });

    it("should handle missing booking data gracefully", async () => {
      const incompleteReviews = [
        {
          ...mockReviews[0],
          booking: null,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: incompleteReviews,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useReviews());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const review = result.current.reviews[0];
      expect(review.booking.id).toBe("");
      expect(review.booking.equipment.id).toBe("");
      expect(review.booking.equipment.title).toBe("");
    });
  });
});
