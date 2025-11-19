import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchListings, fetchListingById } from "./listings";
import { mockSupabaseFrom, resetSupabaseMocks } from "@/__tests__/mocks/supabase";
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
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          })
          // Mock reviews fetch
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
          });

        const listings = await fetchListings();

        expect(listings).toHaveLength(2);
        expect(listings[0].title).toBe("Professional DSLR Camera");
        expect(listings[0].category).toBeDefined();
        expect(listings[0].photos).toBeDefined();
        expect(listings[0].owner).toBeDefined();
        expect(listings[0].reviews).toBeDefined();
      });

      it("should only fetch available equipment", async () => {
        let capturedIsAvailable: boolean | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((field, value) => {
              if (field === "is_available") capturedIsAvailable = value;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings();

        expect(capturedIsAvailable).toBe(true);
      });

      it("should order by created_at descending", async () => {
        let capturedOrderField: string | undefined;
        let capturedOrderDirection: { ascending: boolean } | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn((field, direction) => {
              capturedOrderField = field;
              capturedOrderDirection = direction;
              return Promise.resolve({ data: [], error: null });
            }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings();

        expect(capturedOrderField).toBe("created_at");
        expect(capturedOrderDirection).toEqual({ ascending: false });
      });

      it("should handle empty results", async () => {
        mockSupabaseFrom.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        const listings = await fetchListings();

        expect(listings).toEqual([]);
      });

      it("should throw error on query failure", async () => {
        const mockError = new Error("Database connection failed");

        mockSupabaseFrom.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        });

        await expect(fetchListings()).rejects.toThrow("Database connection failed");
      });
    });

    describe("Filtering", () => {
      it("should filter by category", async () => {
        let capturedCategoryId: string | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((field, value) => {
              if (field === "category_id") capturedCategoryId = value;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ categoryId: "cat-cameras" });

        expect(capturedCategoryId).toBe("cat-cameras");
      });

      it("should not filter when category is 'all'", async () => {
        let categoryFilterCalled = false;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((field) => {
              if (field === "category_id") categoryFilterCalled = true;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ categoryId: "all" });

        expect(categoryFilterCalled).toBe(false);
      });

      it("should filter by minimum price", async () => {
        let capturedPriceMin: number | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn((field, value) => {
              if (field === "daily_rate") capturedPriceMin = value;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ priceMin: 100 });

        expect(capturedPriceMin).toBe(100);
      });

      it("should filter by maximum price", async () => {
        let capturedPriceMax: number | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn((field, value) => {
              if (field === "daily_rate") capturedPriceMax = value;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ priceMax: 200 });

        expect(capturedPriceMax).toBe(200);
      });

      it("should filter by price range", async () => {
        const filters = { priceMin: 50, priceMax: 150 };
        let capturedMin: number | undefined;
        let capturedMax: number | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn((field, value) => {
              if (field === "daily_rate") capturedMin = value;
              return {
                lte: vi.fn((field, value) => {
                  if (field === "daily_rate") capturedMax = value;
                  return {
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }),
              };
            }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings(filters);

        expect(capturedMin).toBe(50);
        expect(capturedMax).toBe(150);
      });

      it("should filter by condition", async () => {
        let capturedCondition: string | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((field, value) => {
              if (field === "condition") capturedCondition = value;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ condition: "excellent" });

        expect(capturedCondition).toBe("excellent");
      });

      it("should not filter when condition is 'all'", async () => {
        let conditionFilterCalled = false;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((field) => {
              if (field === "condition") conditionFilterCalled = true;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ condition: "all" });

        expect(conditionFilterCalled).toBe(false);
      });

      it("should filter by location using case-insensitive partial match", async () => {
        let capturedLocation: string | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn((field, pattern) => {
              if (field === "location") capturedLocation = pattern;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ location: "Los Angeles" });

        expect(capturedLocation).toBe("%Los Angeles%");
      });

      it("should ignore empty location string", async () => {
        let locationFilterCalled = false;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn((field) => {
              if (field === "location") locationFilterCalled = true;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ location: "   " });

        expect(locationFilterCalled).toBe(false);
      });

      it("should filter by search term in title and description", async () => {
        let capturedSearchPattern: string | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn((pattern) => {
              capturedSearchPattern = pattern;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ search: "camera" });

        expect(capturedSearchPattern).toBe("title.ilike.%camera%,description.ilike.%camera%");
      });

      it("should sanitize search term to prevent injection", async () => {
        let capturedSearchPattern: string | undefined;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn((pattern) => {
              capturedSearchPattern = pattern;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ search: "test(),()" });

        // Parentheses and commas should be removed
        expect(capturedSearchPattern).toBe("title.ilike.%test%,description.ilike.%test%");
      });

      it("should ignore empty search string", async () => {
        let searchFilterCalled = false;

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn(() => {
              searchFilterCalled = true;
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        await fetchListings({ search: "  " });

        expect(searchFilterCalled).toBe(false);
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

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          });

        const listings = await fetchListings(filters);

        expect(listings).toEqual([]);
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

        let reviewsQueryOwnerIds: string[] = [];

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn((field, ids) => {
              if (field === "reviewee_id") reviewsQueryOwnerIds = ids;
              return Promise.resolve({ data: mockReviews, error: null });
            }),
          });

        await fetchListings();

        // Should only query reviews once with all unique owner IDs
        expect(reviewsQueryOwnerIds).toEqual(["owner-1", "owner-2"]);
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

        let reviewsQueryOwnerIds: string[] = [];

        mockSupabaseFrom
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn((field, ids) => {
              if (field === "reviewee_id") reviewsQueryOwnerIds = ids;
              return Promise.resolve({ data: mockReviews, error: null });
            }),
          });

        await fetchListings();

        // Should only have unique owner IDs
        expect(reviewsQueryOwnerIds).toEqual(["owner-1"]);
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

        mockSupabaseFrom.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockDataNoOwner, error: null }),
        });

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
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
          });

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
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mixedData, error: null }),
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
          });

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
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockQueryResult, error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: mockReviews.slice(0, 3), error: null }),
          })),
        });

      const listing = await fetchListingById("eq-camera-1");

      expect(listing).toBeDefined();
      expect(listing?.id).toBe("eq-camera-1");
      expect(listing?.category).toBeDefined();
      expect(listing?.photos).toBeDefined();
      expect(listing?.owner).toBeDefined();
      expect(listing?.reviews).toHaveLength(3);
    });

    it("should return null when listing not found", async () => {
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      const listing = await fetchListingById("non-existent-id");

      expect(listing).toBe(null);
    });

    it("should throw error on query failure", async () => {
      const mockError = new Error("Not found");

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          })),
        })),
      });

      await expect(fetchListingById("eq-camera-1")).rejects.toThrow("Not found");
    });

    it("should throw error for invalid listing data", async () => {
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockInvalidQueryResults.missingTitle,
              error: null,
            }),
          })),
        })),
      });

      await expect(fetchListingById("eq-camera-1")).rejects.toThrow(
        "Invalid listing data received from database"
      );
    });

    it("should return empty reviews when owner is null", async () => {
      const dataWithoutOwner = {
        ...mockQueryResult,
        owner: null,
      };

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: dataWithoutOwner, error: null }),
          })),
        })),
      });

      const listing = await fetchListingById("eq-camera-1");

      expect(listing?.reviews).toEqual([]);
      // Should not have called for reviews
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
    });

    it("should fetch reviews for the listing owner", async () => {
      let capturedRevieweeId: string | undefined;

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockQueryResult, error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn((field, value) => {
              if (field === "reviewee_id") capturedRevieweeId = value;
              return Promise.resolve({ data: mockReviews, error: null });
            }),
          })),
        });

      await fetchListingById("eq-camera-1");

      expect(capturedRevieweeId).toBe("owner-1");
    });

    it("should handle missing reviews gracefully", async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockQueryResult, error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        });

      const listing = await fetchListingById("eq-camera-1");

      expect(listing?.reviews).toEqual([]);
    });
  });
});
