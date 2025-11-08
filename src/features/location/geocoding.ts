import { reverseGeocodeGoogle } from './providers/google';

export interface GeocodingOptions {
  signal?: AbortSignal;
  language?: string;
}

interface CacheEntry {
  label: string;
  ts: number;
}

// In-memory cache with 5-minute TTL
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(lat: number, lon: number): string {
  // Round to 3 decimal places for reasonable cache granularity
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function getFromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if the entry is still valid
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.label;
}

function setCache(key: string, label: string): void {
  cache.set(key, {
    label,
    ts: Date.now(),
  });
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  opts: GeocodingOptions = {}
): Promise<string | null> {
  const key = getCacheKey(lat, lon);

  // Check cache first
  const cachedLabel = getFromCache(key);
  if (cachedLabel) {
    return cachedLabel;
  }

  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('VITE_GOOGLE_MAPS_API_KEY is not set');
    return null;
  }

  // Call Google Geocoding API
  const result = await reverseGeocodeGoogle(lat, lon, {
    ...opts,
    apiKey,
  });
  
  if (result) {
    // Cache the result
    setCache(key, result.label);
    return result.label;
  }

  return null;
}
