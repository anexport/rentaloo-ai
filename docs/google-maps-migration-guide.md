# Migration Guide: Replacing Nominatim with Google Maps API

## Overview

This guide provides step-by-step instructions for replacing the current Nominatim (OpenStreetMap) geocoding implementation with Google Maps Platform APIs.

**Current State:** The application uses Nominatim for:
1. **Forward Geocoding (Address Autocomplete)**: Converting user-typed addresses into coordinates
2. **Reverse Geocoding**: Converting coordinates (lat/lon) into human-readable addresses

**Target State:** Replace Nominatim with:
1. **Google Places API (Autocomplete)** for address suggestions
2. **Google Geocoding API** for reverse geocoding

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Google Maps Platform Setup](#google-maps-platform-setup)
3. [Implementation Steps](#implementation-steps)
4. [Testing](#testing)

---

## Prerequisites

- [ ] Access to Google Cloud Console (https://console.cloud.google.com/)
- [ ] Billing account set up in Google Cloud
- [ ] Access to environment variables configuration
- [ ] Repository access

---

## Current Architecture

### Files to Modify

| File Path | Purpose |
|-----------|---------|
| `src/features/location/providers/nominatim.ts` | Core Nominatim API integration (search & reverse geocode) |
| `src/features/location/forwardGeocoding.ts` | Forward geocoding wrapper with caching |
| `src/features/location/geocoding.ts` | Reverse geocoding wrapper with caching |
| `src/features/location/useAddressAutocomplete.ts` | React hook for autocomplete functionality |
| `src/features/location/useGeolocation.ts` | Browser geolocation API wrapper (unchanged) |
| `src/components/explore/SearchBarPopover.tsx` | UI component using autocomplete |

### Key Features to Preserve

- **Caching**: 5-minute in-memory cache
- **Debouncing**: 300ms before API calls
- **Abort Signal Support**: Request cancellation
- **Language Support**: Uses `navigator.language`
- **Country Bias**: Optional country filtering
- **Error Handling**: Graceful error messages
- **Loading States**: Visual feedback

---

## Google Maps Platform Setup

### Step 1: Create/Configure Google Cloud Project

1. **Navigate to Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click "Select a project" dropdown at the top
   - Click "NEW PROJECT"
   - Enter project name: `rentaloo-maps` (or your preferred name)
   - Select billing account
   - Click "CREATE"

3. **Enable Required APIs**
   - Navigate to "APIs & Services" → "Library"
   - Search for and enable the following APIs:
     - **Places API (New)** - for autocomplete suggestions
     - **Geocoding API** - for reverse geocoding
     - **Maps JavaScript API** - (optional, for future map display)

### Step 2: Create API Key

1. **Generate API Key**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "CREATE CREDENTIALS" → "API key"
   - Copy the generated API key immediately
   - Click "EDIT API KEY" to configure restrictions

2. **Restrict API Key** (CRITICAL for security)
   
   **Application Restrictions:**
   - Select "HTTP referrers (websites)"
   - Add your domains:
     ```
     http://localhost:*
     http://localhost:5173/*
     https://yourdomain.com/*
     https://*.yourdomain.com/*
     ```
   
   **API Restrictions:**
   - Select "Restrict key"
   - Select only the APIs you're using:
     - Places API (New)
     - Geocoding API
   - Click "SAVE"

3. **Store API Key Securely**
   - Add to your `.env.local` file (NOT committed to git):
     ```env
     VITE_GOOGLE_MAPS_API_KEY=AIza...your-key-here
     ```
   - Add to your production environment variables

---

## Implementation Steps

### Phase 1: Create Google Provider Module

**File to create:** `src/features/location/providers/google.ts`

This file will mirror the structure of `nominatim.ts` but use Google APIs.

```typescript
/**
 * Google Maps Platform API integration for geocoding and place search
 * Replaces Nominatim/OpenStreetMap with Google Places API (New) and Geocoding API
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GoogleGeocodingOptions {
  signal?: AbortSignal;
  language?: string;
  apiKey: string;
}

export interface GoogleGeocodingResult {
  label: string; // Formatted address to display to user
}

export interface GooglePlacesAutocompleteOptions {
  signal?: AbortSignal;
  language?: string;
  apiKey: string;
  limit?: number; // Max number of results (default 5)
  locationBias?: string; // Optional: country code(s) separated by |, e.g., "us|ca"
}

export interface GooglePlacePrediction {
  place_id: string;
  description: string;
}

export interface GooglePlaceDetails {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// ============================================================================
// REVERSE GEOCODING (Coordinates → Address)
// ============================================================================

/**
 * Converts latitude/longitude to a human-readable address using Google Geocoding API
 * 
 * API Documentation: https://developers.google.com/maps/documentation/geocoding/overview
 * 
 * @param lat - Latitude
 * @param lon - Longitude  
 * @param opts - Options including API key, language, and abort signal
 * @returns Formatted address or null on error
 */
export async function reverseGeocodeGoogle(
  lat: number,
  lon: number,
  opts: GoogleGeocodingOptions
): Promise<GoogleGeocodingResult | null> {
  const { signal, language = 'en', apiKey } = opts;

  if (!apiKey) {
    console.error('Google Maps API key is required for reverse geocoding');
    return null;
  }

  try {
    // Build API URL
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lon}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', language);
    
    // Request locality or administrative_area results for better UX
    url.searchParams.set('result_type', 'locality|administrative_area_level_1|administrative_area_level_2');

    const response = await fetch(url.toString(), { signal });

    if (!response.ok) {
      console.error('Google Geocoding API request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();

    // Handle API-level errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Geocoding API returned error', {
        status: data.status,
        error_message: data.error_message,
      });
      return null;
    }

    // No results found
    if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
      // Fallback to rounded coordinates
      return {
        label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      };
    }

    // Parse the first result
    const result = data.results[0];
    const addressComponents = result.address_components || [];

    // Extract locality (city/town) and administrative area (state/region)
    let locality = '';
    let adminArea = '';
    let countryCode = '';

    for (const component of addressComponents) {
      const types = component.types || [];
      
      if (types.includes('locality')) {
        locality = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        adminArea = component.short_name; // Use short_name for state abbreviations (e.g., "CA")
      } else if (types.includes('country')) {
        countryCode = component.short_name;
      }
    }

    // Build label similar to Nominatim format: "City, State" or fallback patterns
    let label: string;

    if (locality && adminArea) {
      label = `${locality}, ${adminArea}`;
    } else if (adminArea && countryCode) {
      label = `${adminArea}, ${countryCode}`;
    } else if (adminArea) {
      label = adminArea;
    } else if (countryCode) {
      label = countryCode;
    } else {
      // Last resort: use formatted_address or coordinates
      label = result.formatted_address || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }

    return { label };

  } catch (error) {
    // Check if it's an abort error
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw error;
    }

    console.error('Google reverse geocoding request failed', {
      lat,
      lon,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// FORWARD GEOCODING (Address Search → Coordinates)
// ============================================================================

/**
 * Fetches place details including coordinates for a given place_id
 * 
 * @param placeId - Google Place ID from autocomplete
 * @param apiKey - Google Maps API key
 * @param signal - Optional abort signal
 * @returns Place details with coordinates or null on error
 */
async function getPlaceDetails(
  placeId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<GooglePlaceDetails | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'geometry');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), { signal });

    if (!response.ok) {
      console.error('Google Place Details API request failed', {
        status: response.status,
        place_id: placeId,
      });
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.error('Google Place Details API returned error', {
        status: data.status,
        error_message: data.error_message,
        place_id: placeId,
      });
      return null;
    }

    return data.result;

  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw error;
    }

    console.error('Google Place Details request failed', {
      place_id: placeId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Searches for places matching a query using Google Places API Autocomplete
 * Returns results with coordinates for each suggestion
 * 
 * API Documentation: https://developers.google.com/maps/documentation/places/web-service/autocomplete
 * 
 * @param query - User's search query
 * @param opts - Options including API key, limit, language, location bias
 * @returns Array of suggestions with coordinates
 */
export async function searchGooglePlaces(
  query: string,
  opts: GooglePlacesAutocompleteOptions
): Promise<Array<{ id: string; label: string; lat: number; lon: number }>> {
  const q = query.trim();
  if (!q) return [];

  const {
    signal,
    language = 'en',
    apiKey,
    limit = 5,
    locationBias,
  } = opts;

  if (!apiKey) {
    console.error('Google Maps API key is required for place search');
    return [];
  }

  try {
    // ========================================================================
    // STEP 1: Get autocomplete predictions
    // ========================================================================
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', q);
    autocompleteUrl.searchParams.set('key', apiKey);
    autocompleteUrl.searchParams.set('language', language);
    
    // Bias results to specific countries if provided
    if (locationBias) {
      autocompleteUrl.searchParams.set('components', `country:${locationBias}`);
    }

    const autocompleteResponse = await fetch(autocompleteUrl.toString(), { signal });

    if (!autocompleteResponse.ok) {
      console.error('Google Places Autocomplete API request failed', {
        status: autocompleteResponse.status,
        statusText: autocompleteResponse.statusText,
      });
      throw new Error(
        `Google Places Autocomplete failed with status ${autocompleteResponse.status}`
      );
    }

    const autocompleteData = await autocompleteResponse.json();

    if (autocompleteData.status !== 'OK' && autocompleteData.status !== 'ZERO_RESULTS') {
      console.error('Google Places Autocomplete API returned error', {
        status: autocompleteData.status,
        error_message: autocompleteData.error_message,
      });
      throw new Error(
        autocompleteData.error_message || `Google Places API error: ${autocompleteData.status}`
      );
    }

    if (autocompleteData.status === 'ZERO_RESULTS' || !autocompleteData.predictions) {
      return [];
    }

    const predictions: GooglePlacePrediction[] = autocompleteData.predictions.slice(0, limit);

    // ========================================================================
    // STEP 2: Fetch coordinates for each prediction
    // ========================================================================
    // Note: This makes multiple API calls. For better performance and cost optimization,
    // consider using Places API (New) which can return coordinates in the autocomplete response.
    // See: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
    
    const resultsWithCoords = await Promise.all(
      predictions.map(async (prediction) => {
        const details = await getPlaceDetails(prediction.place_id, apiKey, signal);
        
        if (!details || !details.geometry || !details.geometry.location) {
          console.warn('Could not get coordinates for place', {
            place_id: prediction.place_id,
            description: prediction.description,
          });
          return null;
        }

        return {
          id: prediction.place_id,
          label: prediction.description,
          lat: details.geometry.location.lat,
          lon: details.geometry.location.lng,
        };
      })
    );

    // Filter out any null results (places without coordinates)
    return resultsWithCoords.filter((result): result is NonNullable<typeof result> => result !== null);

  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw error;
    }

    console.error('Google Places search request failed', {
      query: q,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

**Note:** Each autocomplete suggestion requires a separate Place Details API call to get coordinates. For optimization, consider migrating to [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview) which returns coordinates directly.

---

### Phase 2: Update Forward Geocoding Module

**File to modify:** `src/features/location/forwardGeocoding.ts`

Replace the Nominatim import with Google:

```typescript
// BEFORE:
import { searchNominatim, type NominatimSearchOptions } from './providers/nominatim';

// AFTER:
import { searchGooglePlaces, type GooglePlacesAutocompleteOptions } from './providers/google';

export type Suggestion = { id: string; label: string; lat: number; lon: number };

const cache = new Map<string, { ts: number; items: Suggestion[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function key(query: string, lang?: string, cc?: string) {
  return `${query.trim().toLowerCase()}|${lang || 'en'}|${cc || ''}`;
}

export function getCachedSuggestions(
  query: string,
  opts: { language?: string; countrycodes?: string } = {}
): Suggestion[] | null {
  const k = key(query, opts.language, opts.countrycodes);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.items;
  return null;
}

export async function suggestLocations(
  query: string,
  opts: GooglePlacesAutocompleteOptions // CHANGED TYPE
): Promise<Suggestion[]> {
  const cached = getCachedSuggestions(query, {
    language: opts.language,
    countrycodes: opts.locationBias, // CHANGED: countrycodes → locationBias
  });
  if (cached) return cached;

  const k = key(query, opts.language, opts.locationBias); // CHANGED
  const items = await searchGooglePlaces(query, opts); // CHANGED FUNCTION
  cache.set(k, { ts: Date.now(), items });
  return items;
}
```

**Key Changes:**
1. Import `searchGooglePlaces` instead of `searchNominatim`
2. Change `NominatimSearchOptions` to `GooglePlacesAutocompleteOptions`
3. Rename `countrycodes` to `locationBias` (Google's terminology)
4. Function call from `searchNominatim` to `searchGooglePlaces`

---

### Phase 3: Update Reverse Geocoding Module

**File to modify:** `src/features/location/geocoding.ts`

Replace the Nominatim import with Google:

```typescript
// BEFORE:
import { reverseGeocodeNominatim } from './providers/nominatim';

// AFTER:
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

  // Call Google Geocoding API (CHANGED)
  const result = await reverseGeocodeGoogle(lat, lon, {
    ...opts,
    apiKey, // ADDED: Pass API key
  });
  
  if (result) {
    // Cache the result
    setCache(key, result.label);
    return result.label;
  }

  return null;
}
```

**Key Changes:**
1. Import `reverseGeocodeGoogle` instead of `reverseGeocodeNominatim`
2. Get API key from environment variable
3. Pass API key to the Google function

---

### Phase 4: Update Autocomplete Hook

**File to modify:** `src/features/location/useAddressAutocomplete.ts`

Update to pass the API key to the Google functions:

```typescript
import { useEffect, useMemo, useRef, useState } from "react";
import {
  suggestLocations,
  getCachedSuggestions,
  type Suggestion,
} from "./forwardGeocoding";

export function useAddressAutocomplete(params?: {
  language?: string;
  limit?: number;
  countrycodes?: string; // Keep this for API compatibility, map to locationBias internally
  minLength?: number;
  debounceMs?: number;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const minLength = params?.minLength ?? 2;
  const debounceMs = params?.debounceMs ?? 300;

  const opts = useMemo(() => {
    // Get API key from environment (ADDED)
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('VITE_GOOGLE_MAPS_API_KEY is not set');
    }

    return {
      language:
        params?.language ??
        (typeof navigator !== "undefined" ? navigator.language : "en"),
      limit: params?.limit ?? 5,
      locationBias: params?.countrycodes, // CHANGED: map countrycodes to locationBias
      apiKey: apiKey || '', // ADDED
    };
  }, [params?.language, params?.limit, params?.countrycodes]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache immediately for instant results (no debounce for cached)
    const cached = getCachedSuggestions(q, {
      language: opts.language,
      countrycodes: opts.locationBias, // CHANGED
    });
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Validate API key before making request (ADDED)
    if (!opts.apiKey) {
      setError('Google Maps API key is not configured');
      setLoading(false);
      return;
    }

    // No cache hit - fetch with minimal debounce
    setLoading(true);
    setError(null);
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const items = await suggestLocations(q, {
          ...opts,
          signal: ctrl.signal,
        });
        if (!ctrl.signal.aborted) {
          setSuggestions(items);
          if (items.length === 0) {
            setError(null);
          }
        }
      } catch (e: unknown) {
        if (
          e &&
          typeof e === "object" &&
          "name" in e &&
          e.name !== "AbortError" &&
          !ctrl.signal.aborted
        ) {
          console.error(`[Autocomplete] Error for "${q}":`, e);
          setSuggestions([]);
          setError(
            e &&
              typeof e === "object" &&
              "message" in e &&
              typeof e.message === "string"
              ? e.message
              : "Failed to load suggestions"
          );
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, opts, minLength, debounceMs]);

  return { query, setQuery, suggestions, loading, error };
}
```

**Key Changes:**
1. Get API key from environment in `useMemo`
2. Add validation to show error if API key is missing
3. Pass API key through opts to `suggestLocations`
4. Map `countrycodes` parameter to `locationBias` for Google API

---

### Phase 5: Add Environment Variables

**Files to modify:**

1. **`.env.local`** (create if doesn't exist, NOT committed to git):
```env
VITE_GOOGLE_MAPS_API_KEY=AIza...your-actual-key-here
```

2. **`.env.example`** (create/update, committed to git as template):
```env
# Google Maps Platform API Key
# Get your key at: https://console.cloud.google.com/google/maps-apis/credentials
# Restrict this key to your domains in production!
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

3. **`.gitignore`** (verify these lines exist):
```
.env
.env.local
.env.*.local
```

4. **Production Environment**:
   - Add `VITE_GOOGLE_MAPS_API_KEY` as an environment variable in your hosting platform
   - **NEVER** commit API keys to git

---

### Phase 6: Clean Up Nominatim Code

Once tested and working:

1. **Remove the Nominatim provider:**
   ```bash
   rm src/features/location/providers/nominatim.ts
   ```

2. **Remove old environment variables** from `.env.example`:
   ```diff
   - VITE_NOMINATIM_BASE=https://nominatim.openstreetmap.org
   - VITE_NOMINATIM_EMAIL=contact@example.com
   ```

---

## Testing

### Forward Geocoding (Autocomplete)
- [ ] Open the app and navigate to the search bar
- [ ] Type "San Francisco" - verify suggestions appear
- [ ] Type "New York, NY" - verify suggestions appear
- [ ] Type "1600 Amphitheatre Parkway" - verify address suggestions
- [ ] Type "Yosemite National Park" - verify location suggestions
- [ ] Type gibberish "asdfjkl" - verify "No locations found" message
- [ ] Verify loading indicator shows while typing
- [ ] Type quickly and verify debouncing works (not too many requests)
- [ ] Select a suggestion - verify it fills the location field correctly
- [ ] Type same query twice - verify second time is instant (cached)

### Reverse Geocoding (Current Location)
- [ ] Click "Use current location" button
- [ ] Grant location permission when prompted
- [ ] Verify location is set to "City, State" format (e.g., "San Francisco, CA")
- [ ] Verify toast notification shows "Location set"
- [ ] Try in different locations (if possible)
- [ ] Test with location permission denied - verify error message
- [ ] Test with location unavailable - verify fallback to coordinates

### Error Handling
- [ ] Remove API key from .env - verify error message shows
- [ ] Test with invalid API key - verify graceful error handling
- [ ] Test with network offline - verify error message

### Verify Caching
- [ ] Search for a location twice - second time should be instant (cached)
- [ ] Wait 6+ minutes - search again should make new API call

### Check DevTools
- [ ] Open Network tab - verify only ONE request per query (debouncing works)
- [ ] Verify no console errors
- [ ] Check response times are acceptable

---

## Verification

After completing all steps:

- [ ] All tests passing
- [ ] No console errors
- [ ] API key restrictions configured
- [ ] Environment variables set in all environments (dev, staging, prod)
- [ ] Old Nominatim code removed

---

## Quick Reference

### API Documentation
- [Places Autocomplete](https://developers.google.com/maps/documentation/places/web-service/autocomplete)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview)
- [API Key Restrictions](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions)
