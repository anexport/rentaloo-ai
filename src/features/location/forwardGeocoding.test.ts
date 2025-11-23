import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  suggestLocations,
  getCachedSuggestions,
  type Suggestion,
} from "./forwardGeocoding";
import * as googleProvider from "./providers/google";

// Mock the Google provider
vi.mock("./providers/google", () => ({
  searchGooglePlaces: vi.fn(),
}));

const mockSuggestions: Suggestion[] = [
  {
    id: "place-1",
    label: "San Francisco, CA, USA",
    lat: 37.7749,
    lon: -122.4194,
  },
  {
    id: "place-2",
    label: "San Francisco International Airport",
    lat: 37.6213,
    lon: -122.379,
  },
];

describe("Forward Geocoding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("suggestLocations()", () => {
    it("should return location suggestions from API", async () => {
      vi.spyOn(googleProvider, "searchGooglePlaces").mockResolvedValueOnce(
        mockSuggestions
      );

      const result = await suggestLocations("San Francisco", {
        apiKey: "test-key",
      });

      expect(result).toEqual(mockSuggestions);
      expect(googleProvider.searchGooglePlaces).toHaveBeenCalledWith(
        "San Francisco",
        { apiKey: "test-key" }
      );
    });

    it("should return empty array if API returns empty", async () => {
      vi.spyOn(googleProvider, "searchGooglePlaces").mockResolvedValueOnce([]);

      const result = await suggestLocations("NonexistentPlace", {
        apiKey: "test-key",
      });

      expect(result).toEqual([]);
    });

    it("should pass through options to provider", async () => {
      vi.spyOn(googleProvider, "searchGooglePlaces").mockResolvedValueOnce(
        mockSuggestions
      );

      await suggestLocations("San Francisco", {
        apiKey: "test-key",
        language: "es",
        locationBias: "40.7128,-74.0060",
        limit: 5,
      });

      expect(googleProvider.searchGooglePlaces).toHaveBeenCalledWith(
        "San Francisco",
        {
          apiKey: "test-key",
          language: "es",
          locationBias: "40.7128,-74.0060",
          limit: 5,
        }
      );
    });

    it("should handle queries with special characters", async () => {
      vi.spyOn(googleProvider, "searchGooglePlaces").mockResolvedValueOnce(
        mockSuggestions
      );

      await suggestLocations("São Paulo, Brazil", { apiKey: "test-key" });

      expect(googleProvider.searchGooglePlaces).toHaveBeenCalledWith(
        "São Paulo, Brazil",
        { apiKey: "test-key" }
      );
    });

    it("should handle empty query string", async () => {
      vi.spyOn(googleProvider, "searchGooglePlaces").mockResolvedValueOnce([]);

      const result = await suggestLocations("", { apiKey: "test-key" });

      expect(result).toEqual([]);
    });
  });

  describe("getCachedSuggestions()", () => {
    it("should return null for cache miss", () => {
      const result = getCachedSuggestions("Uncached Query");
      expect(result).toBe(null);
    });
  });
});
