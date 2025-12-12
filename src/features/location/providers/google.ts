/**
 * Google Maps Platform API integration for geocoding and place search
 * Replaces Nominatim/OpenStreetMap with Google Places API (New) and Geocoding API
 */

import { loadGoogleMaps, isGoogleMapsLoaded, importPlacesLibrary } from '../../../lib/googleMapsLoader';

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
 * Searches for places matching a query using new AutocompleteSuggestion API
 * Returns results with coordinates for each suggestion
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
    // Load Google Maps JavaScript API if not already loaded
    if (!isGoogleMapsLoaded()) {
      await loadGoogleMaps({
        apiKey,
        libraries: ['places'],
        language,
      });
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Import Places library using new API - destructure classes directly
    const { AutocompleteSuggestion, Place, AutocompleteSessionToken } = await importPlacesLibrary();

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Create a session token for billing accuracy
    const sessionToken = new AutocompleteSessionToken();

    // Build request options
    const request: google.maps.places.AutocompleteRequest = {
      input: q,
      language,
      sessionToken,
    };

    // Add component restrictions if locationBias is provided
    if (locationBias) {
      // Normalize legacy comma-separated and pipe-separated values
      // Split on both commas and pipes, trim, filter empty, and uppercase
      request.includedRegionCodes = locationBias
        .split(/[,\|]/)
        .map(code => code.trim().toUpperCase())
        .filter(code => code.length > 0);
    }

    // Fetch suggestions using static method (not instance method)
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!suggestions || suggestions.length === 0) {
      return [];
    }

    // Limit results
    const limitedPredictions = suggestions.slice(0, limit);

    // Fetch coordinates for each prediction using new Place API
    const placeDetailsPromises = limitedPredictions.map(async (suggestion) => {
      try {
        if (signal?.aborted) {
          return null;
        }

        // New API structure: suggestion has placePrediction property
        const placePrediction = suggestion.placePrediction;
        if (!placePrediction) {
          return null;
        }

        // Get place ID and text from placePrediction
        const placeId = placePrediction.placeId;
        const text = placePrediction.text?.toString() || '';

        if (!placeId) {
          return null;
        }

        // Convert prediction to Place object which retains the session context
        // This ensures place detail requests are tied to the autocomplete session
        // and correctly billed as outcomes rather than separate requests
        const place = placePrediction.toPlace();

        // Fetch place details - request location and addressComponents fields with session token
        // Pass sessionToken to maintain the session context for billing
        await place.fetchFields({
          fields: ['location', 'addressComponents'],
          sessionToken
        });

        if (place.location) {
          // Place API has location directly on the Place object, not under geometry
          // location can be either LatLng object or LatLngLiteral { lat, lng }
          const lat = place.location instanceof google.maps.LatLng
            ? place.location.lat()
            : place.location.lat;
          const lng = place.location instanceof google.maps.LatLng
            ? place.location.lng()
            : place.location.lng;

          // Normalize location label to "City, State" format for database compatibility
          // This ensures user searches match equipment locations in the database
          let normalizedLabel = text; // fallback to full text

          if (place.addressComponents && place.addressComponents.length > 0) {
            let cityName = '';
            let adminArea = '';
            let countryCode = '';

            for (const component of place.addressComponents) {
              const types = component.types || [];

              // Extract city/town name from various Google Places component types
              // Priority order: locality > postal_town > sublocality > admin_area_level_2
              // This handles different naming conventions across countries (e.g., UK uses postal_town)
              if (!cityName && types.includes('locality')) {
                cityName = component.longText || component.shortText || '';
              } else if (!cityName && types.includes('postal_town')) {
                // Used in UK and other countries for town/city names
                cityName = component.longText || component.shortText || '';
              } else if (!cityName && types.includes('sublocality_level_1')) {
                // Sometimes used for city districts or smaller towns
                cityName = component.longText || component.shortText || '';
              } else if (!cityName && types.includes('administrative_area_level_2')) {
                // Can represent cities or counties in some countries
                cityName = component.longText || component.shortText || '';
              }

              // Extract state/region (prefer short name for US states, e.g., "CA")
              if (!adminArea && types.includes('administrative_area_level_1')) {
                adminArea = component.shortText || component.longText || '';
              }

              // Extract country code for disambiguation when adminArea is missing
              if (!countryCode && types.includes('country')) {
                countryCode = component.shortText || ''; // e.g., "US", "FR", "IT"
              }
            }

            // Build normalized label with fallback hierarchy for global coverage:
            // 1. "City, State" - Best case (e.g., "Denver, CO")
            // 2. "City, Country" - When state unavailable (e.g., "Paris, FR" vs just "Paris")
            // 3. "City" - Single city name (last resort for city-only data)
            // 4. "State, Country" - When only region available (e.g., "California, US" vs "California, Colombia")
            // 5. "State" - Region only (fallback)
            // 6. Original text - Ultimate fallback
            if (cityName && adminArea) {
              normalizedLabel = `${cityName}, ${adminArea}`;
            } else if (cityName && countryCode) {
              normalizedLabel = `${cityName}, ${countryCode}`;
            } else if (cityName) {
              normalizedLabel = cityName;
            } else if (adminArea && countryCode) {
              normalizedLabel = `${adminArea}, ${countryCode}`;
            } else if (adminArea) {
              normalizedLabel = adminArea;
            }
            // else: keep the original text as fallback
          }

          return {
            id: placeId,
            label: normalizedLabel,
            lat,
            lon: lng,
          };
        }
        return null;
      } catch (error) {
        console.warn('Could not get coordinates for place', {
          suggestion,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const results = await Promise.all(placeDetailsPromises);
    return results.filter(
      (result): result is NonNullable<typeof result> => result !== null
    );
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

