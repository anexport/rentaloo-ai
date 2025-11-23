import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchListings, fetchListingById } from "./listings";
import {
  mockSupabaseFrom,
  resetSupabaseMocks,
  createMockQueryBuilder,
} from "@/__tests__/mocks/supabase";
import {
  mockCamera,
  mockSkis,
  mockDrone,
  mockCameraCategory,
  mockSkiCategory,
  mockPhotos,
  mockOwner1,
  mockOwner2,
  mockReviews,
  mockQueryResult,
  mockInvalidQueryResults,
  mockCameraListing,
  mockSkisListing,
  mockDroneListing,
} from "@/__tests__/mocks/equipmentFixtures";

describe("Equipment Listings Service", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("fetchListings", () => {
    describe("Basic Fetching", () => {
      it("should fetch all available listings with relations", async () => {
        const mockData = [
          {
            ...mockCamera,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1,
          },
          {
            ...mockSkis,
            category: mockSkiCategory,
            photos: [],
            owner: mockOwner2,
          },
        ];

        mockSupabaseFrom
          .mockReturnValueOnce(createMockQueryBuilder({ data: mockData, error: null }))
          // Mock reviews fetch
          .mockReturnValueOnce(createMockQueryBuilder({ data: mockReviews, error: null }));

        const listings = await fetchListings();

        expect(listings).toHaveLength(2);
        expect(listings[0].title).toBe("Professional DSLR Camera");
        expect(listings[0].category).toBeDefined();
        expect(listings[0].photos).toBeDefined();
        expect(listings[0].owner).toBeDefined();
        expect(listings[0].reviews).toBeDefined();
      });

      it("should only fetch available equipment", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings();

        // Check that eq was called with is_available = true
        expect(builder.eq).toHaveBeenCalledWith("is_available", true);
      });

      it("should order by created_at descending", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings();

        // Check that order was called with created_at descending
        expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
      });

      it("should handle empty results", async () => {
        mockSupabaseFrom.mockReturnValueOnce(
          createMockQueryBuilder({ data: [], error: null })
        );

        const listings = await fetchListings();

        expect(listings).toEqual([]);
      });

      it("should throw error on query failure", async () => {
        const mockError = new Error("Database connection failed");

        mockSupabaseFrom.mockReturnValueOnce(
          createMockQueryBuilder({ data: null, error: mockError })
        );

        await expect(fetchListings()).rejects.toThrow("Database connection failed");
      });
    });

    describe("Filtering", () => {
      it("should filter by category", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ categoryId: "cat-cameras" });

        // Check that eq was called with the category filter
        expect(builder.eq).toHaveBeenCalledWith("category_id", "cat-cameras");
      });

      it("should not filter when category is 'all'", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ categoryId: "all" });

        // Should NOT call eq with category_id when category is 'all'
        const eqCalls = builder.eq.mock.calls;
        const categoryCall = eqCalls.find((call: any) => call[0] === "category_id");
        expect(categoryCall).toBeUndefined();
      });

      it("should filter by minimum price", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ priceMin: 100 });

        expect(builder.gte).toHaveBeenCalledWith("daily_rate", 100);
      });

      it("should filter by maximum price", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ priceMax: 200 });

        expect(builder.lte).toHaveBeenCalledWith("daily_rate", 200);
      });

      it("should filter by price range", async () => {
        const filters = { priceMin: 50, priceMax: 150 };
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings(filters);

        expect(builder.gte).toHaveBeenCalledWith("daily_rate", 50);
        expect(builder.lte).toHaveBeenCalledWith("daily_rate", 150);
      });

      it("should filter by condition", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ condition: "excellent" });

        expect(builder.eq).toHaveBeenCalledWith("condition", "excellent");
      });

      it("should not filter when condition is 'all'", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ condition: "all" });

        // Should NOT call eq with condition when it's 'all'
        const eqCalls = builder.eq.mock.calls;
        const conditionCall = eqCalls.find((call: any) => call[0] === "condition");
        expect(conditionCall).toBeUndefined();
      });

      it("should filter by location using case-insensitive partial match", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ location: "Los Angeles" });

        expect(builder.ilike).toHaveBeenCalledWith("location", "%Los Angeles%");
      });

      it("should ignore empty location string", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ location: "   " });

        expect(builder.ilike).not.toHaveBeenCalled();
      });

      it("should filter by search term in title and description", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ search: "camera" });

        expect(builder.or).toHaveBeenCalledWith("title.ilike.%camera%,description.ilike.%camera%");
      });

      it("should sanitize search term to prevent injection", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ search: "test(),()" });

        // Parentheses and commas should be removed
        expect(builder.or).toHaveBeenCalledWith("title.ilike.%test%,description.ilike.%test%");
      });

      it("should ignore empty search string", async () => {
        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        await fetchListings({ search: "  " });

        expect(builder.or).not.toHaveBeenCalled();
      });

      it("should combine multiple filters", async () => {
        const filters = {
          categoryId: "cat-cameras",
          priceMin: 100,
          priceMax: 200,
          condition: "excellent" as const,
          location: "Los Angeles",
          search: "camera",
        };

        const builder = createMockQueryBuilder({ data: [], error: null });
        mockSupabaseFrom.mockReturnValueOnce(builder);

        const listings = await fetchListings(filters);

        expect(listings).toEqual([]);
        // Verify all filters were applied
        expect(builder.eq).toHaveBeenCalledWith("category_id", "cat-cameras");
        expect(builder.gte).toHaveBeenCalledWith("daily_rate", 100);
        expect(builder.lte).toHaveBeenCalledWith("daily_rate", 200);
        expect(builder.eq).toHaveBeenCalledWith("condition", "excellent");
        expect(builder.ilike).toHaveBeenCalledWith("location", "%Los Angeles%");
        expect(builder.or).toHaveBeenCalled();
      });
    });

    describe("N+1 Prevention", () => {
      it("should batch fetch reviews for all owners in single query", async () => {
        const mockData = [
          {
            ...mockCamera,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1,
          },
          {
            ...mockDrone,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1,
          },
          {
            ...mockSkis,
            category: mockSkiCategory,
            photos: [],
            owner: mockOwner2,
          },
        ];

        const equipmentBuilder = createMockQueryBuilder({ data: mockData, error: null });
        const reviewsBuilder = createMockQueryBuilder({ data: mockReviews, error: null });

        mockSupabaseFrom
          .mockReturnValueOnce(equipmentBuilder)
          .mockReturnValueOnce(reviewsBuilder);

        await fetchListings();

        // Should only query reviews once with all unique owner IDs
        expect(reviewsBuilder.in).toHaveBeenCalledWith("reviewee_id", ["owner-1", "owner-2"]);
        expect(mockSupabaseFrom).toHaveBeenCalledTimes(2); // Equipment + Reviews
      });

      it("should deduplicate owner IDs for review fetch", async () => {
        const mockData = [
          {
            ...mockCamera,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1,
          },
          {
            ...mockDrone,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1, // Same owner as camera
          },
        ];

        const equipmentBuilder = createMockQueryBuilder({ data: mockData, error: null });
        const reviewsBuilder = createMockQueryBuilder({ data: mockReviews, error: null });

        mockSupabaseFrom
          .mockReturnValueOnce(equipmentBuilder)
          .mockReturnValueOnce(reviewsBuilder);

        await fetchListings();

        // Should only have unique owner IDs
        expect(reviewsBuilder.in).toHaveBeenCalledWith("reviewee_id", ["owner-1"]);
      });

      it("should not fetch reviews when no owners present", async () => {
        const mockDataNoOwner = [
          {
            ...mockCamera,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: null,
          },
        ];

        mockSupabaseFrom.mockReturnValueOnce(
          createMockQueryBuilder({ data: mockDataNoOwner, error: null })
        );

        const listings = await fetchListings();

        // Should only call from() once for equipment, not for reviews
        expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
        expect(listings[0].reviews).toEqual([]);
      });

      it("should correctly map reviews to listings by owner ID", async () => {
        const mockData = [
          {
            ...mockCamera,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1,
          },
          {
            ...mockSkis,
            category: mockSkiCategory,
            photos: [],
            owner: mockOwner2,
          },
        ];

        mockSupabaseFrom
          .mockReturnValueOnce(createMockQueryBuilder({ data: mockData, error: null }))
          .mockReturnValueOnce(createMockQueryBuilder({ data: mockReviews, error: null }));

        const listings = await fetchListings();

        // Owner 1 has 3 reviews (ratings: 5, 4, 5)
        expect(listings[0].reviews).toHaveLength(3);
        expect(listings[0].reviews?.map((r) => r.rating)).toEqual([5, 4, 5]);

        // Owner 2 has 2 reviews (ratings: 3, 4)
        expect(listings[1].reviews).toHaveLength(2);
        expect(listings[1].reviews?.map((r) => r.rating)).toEqual([3, 4]);
      });
    });

    describe("Data Validation", () => {
      it("should filter out invalid listings", async () => {
        const mixedData = [
          {
            ...mockCamera,
            category: mockCameraCategory,
            photos: mockPhotos,
            owner: mockOwner1,
          },
          mockInvalidQueryResults.missingTitle,
          {
            ...mockSkis,
            category: mockSkiCategory,
            photos: [],
            owner: mockOwner2,
          },
        ];

        mockSupabaseFrom
          .mockReturnValueOnce(createMockQueryBuilder({ data: mixedData, error: null }))
          .mockReturnValueOnce(createMockQueryBuilder({ data: mockReviews, error: null }));

        const listings = await fetchListings();

        // Should only return valid listings
        expect(listings).toHaveLength(2);
        expect(listings.every((l) => l.title)).toBe(true);
      });
    });
  });

  describe("fetchListingById", () => {
    it("should fetch single listing by ID with relations", async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: mockQueryResult, error: null }))
        .mockReturnValueOnce(createMockQueryBuilder({ data: mockReviews.slice(0, 3), error: null }));

      const listing = await fetchListingById("eq-camera-1");

      expect(listing).toBeDefined();
      expect(listing?.id).toBe("eq-camera-1");
      expect(listing?.category).toBeDefined();
      expect(listing?.photos).toBeDefined();
      expect(listing?.owner).toBeDefined();
      expect(listing?.reviews).toHaveLength(3);
    });

    it("should return null when listing not found", async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createMockQueryBuilder({ data: null, error: null })
      );

      const listing = await fetchListingById("non-existent-id");

      expect(listing).toBe(null);
    });

    it("should throw error on query failure", async () => {
      const mockError = new Error("Not found");

      mockSupabaseFrom.mockReturnValueOnce(
        createMockQueryBuilder({ data: null, error: mockError })
      );

      await expect(fetchListingById("eq-camera-1")).rejects.toThrow("Not found");
    });

    it("should throw error for invalid listing data", async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createMockQueryBuilder({
          data: mockInvalidQueryResults.missingTitle,
          error: null,
        })
      );

      await expect(fetchListingById("eq-camera-1")).rejects.toThrow(
        "Invalid listing data received from database"
      );
    });

    it("should return empty reviews when owner is null", async () => {
      const dataWithoutOwner = {
        ...mockQueryResult,
        owner: null,
      };

      mockSupabaseFrom.mockReturnValueOnce(
        createMockQueryBuilder({ data: dataWithoutOwner, error: null })
      );

      const listing = await fetchListingById("eq-camera-1");

      expect(listing?.reviews).toEqual([]);
      // Should not have called for reviews
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
    });

    it("should fetch reviews for the listing owner", async () => {
      const listingBuilder = createMockQueryBuilder({ data: mockQueryResult, error: null });
      const reviewsBuilder = createMockQueryBuilder({ data: mockReviews, error: null });

      mockSupabaseFrom
        .mockReturnValueOnce(listingBuilder)
        .mockReturnValueOnce(reviewsBuilder);

      await fetchListingById("eq-camera-1");

      // Check that reviews were fetched for the owner
      expect(reviewsBuilder.eq).toHaveBeenCalledWith("reviewee_id", "owner-1");
    });

    it("should handle missing reviews gracefully", async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: mockQueryResult, error: null }))
        .mockReturnValueOnce(createMockQueryBuilder({ data: null, error: null }));

      const listing = await fetchListingById("eq-camera-1");

      expect(listing?.reviews).toEqual([]);
    });
  });
});
