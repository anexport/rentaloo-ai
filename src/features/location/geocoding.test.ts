import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reverseGeocode, type GeocodingOptions } from "./geocoding";
import * as googleProvider from "./providers/google";

// Mock the Google provider
vi.mock("./providers/google", () => ({
  reverseGeocodeGoogle: vi.fn(),
}));

describe("Geocoding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("reverseGeocode()", () => {
    it("should return location label for valid coordinates", async () => {
      const mockResult = { label: "San Francisco, CA, USA" };
      vi.spyOn(googleProvider, "reverseGeocodeGoogle").mockResolvedValueOnce(
        mockResult
      );

      const result = await reverseGeocode(37.7749, -122.4194);

      expect(result).toBe("San Francisco, CA, USA");
      expect(googleProvider.reverseGeocodeGoogle).toHaveBeenCalledWith(
        37.7749,
        -122.4194,
        expect.objectContaining({ apiKey: "test-api-key" })
      );
    });

    it("should return null if API returns null", async () => {
      vi.spyOn(googleProvider, "reverseGeocodeGoogle").mockResolvedValueOnce(
        null
      );

      const result = await reverseGeocode(0, 0);

      expect(result).toBe(null);
    });

    it("should return null if API key is missing", async () => {
      vi.unstubAllEnvs();

      const result = await reverseGeocode(37.7749, -122.4194);

      expect(result).toBe(null);
      expect(googleProvider.reverseGeocodeGoogle).not.toHaveBeenCalled();
    });

    it("should pass through options to provider", async () => {
      const mockResult = { label: "Location" };
      vi.spyOn(googleProvider, "reverseGeocodeGoogle").mockResolvedValueOnce(
        mockResult
      );

      const options: GeocodingOptions = {
        language: "es",
        signal: new AbortController().signal,
      };

      await reverseGeocode(37.7749, -122.4194, options);

      expect(googleProvider.reverseGeocodeGoogle).toHaveBeenCalledWith(
        37.7749,
        -122.4194,
        expect.objectContaining({
          language: "es",
          signal: options.signal,
          apiKey: "test-api-key",
        })
      );
    });

    it("should handle negative coordinates", async () => {
      const mockResult = { label: "Sydney, Australia" };
      vi.spyOn(googleProvider, "reverseGeocodeGoogle").mockResolvedValueOnce(
        mockResult
      );

      const result = await reverseGeocode(-33.8688, 151.2093);
      expect(result).toBe("Sydney, Australia");
    });

    it("should handle coordinates at boundaries", async () => {
      const mockResult1 = { label: "North Pole" };
      const mockResult2 = { label: "South Pole" };
      const mockResult3 = { label: "Null Island" };

      const spy = vi
        .spyOn(googleProvider, "reverseGeocodeGoogle")
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2)
        .mockResolvedValueOnce(mockResult3);

      await reverseGeocode(90, 180);
      await reverseGeocode(-90, -180);
      await reverseGeocode(0, 0);

      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

});
