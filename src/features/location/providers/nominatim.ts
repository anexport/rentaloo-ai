export interface NominatimOptions {
  signal?: AbortSignal;
  language?: string;
  baseUrl?: string;
}

export interface NominatimResult {
  label: string;
}

export interface NominatimSearchItem {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface NominatimSearchOptions {
  signal?: AbortSignal;
  language?: string;
  baseUrl?: string;
  limit?: number; // default 5
  countrycodes?: string; // optional bias, e.g., "us,gb"
  viewbox?: string; // optional bias: "left,top,right,bottom"
  bounded?: "1" | "0";
}

export interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  region?: string;
  country_code?: string;
}

export interface NominatimResponse {
  address?: NominatimAddress;
}

export async function reverseGeocodeNominatim(
  lat: number,
  lon: number,
  opts: NominatimOptions = {}
): Promise<NominatimResult | null> {
  const {
    signal,
    language = "en",
    baseUrl = import.meta.env.VITE_NOMINATIM_BASE ||
      "https://nominatim.openstreetmap.org",
  } = opts;

  try {
    const url = new URL(`${baseUrl}/reverse`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lon.toString());
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", language);

    // Add email contact info via query parameter (browsers cannot set User-Agent header)
    const email = import.meta.env.VITE_NOMINATIM_EMAIL;
    if (email) {
      url.searchParams.set("email", email);
    }

    const response = await fetch(url.toString(), {
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const data: NominatimResponse = await response.json();

    if (!data.address) {
      // If no address data, return rounded coordinates
      return {
        label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      };
    }

    const { address } = data;

    // Try to find a locality (city, town, village, or hamlet)
    const locality =
      address.city || address.town || address.village || address.hamlet;

    // Get region/state
    const region = address.state || address.region;

    // Get country code
    const countryCode = address.country_code?.toUpperCase();

    let label: string;

    if (locality && region) {
      // If we have locality and region, use them
      label = `${locality}, ${region}`;
    } else if (region && countryCode) {
      // If no locality but we have region and country
      label = `${region}, ${countryCode}`;
    } else if (region) {
      // If only region
      label = region;
    } else if (countryCode) {
      // If only country
      label = countryCode;
    } else {
      // Fallback to coordinates
      label = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }

    return { label };
  } catch (error) {
    const requestUrl = `${baseUrl}/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    console.error("Nominatim reverse geocoding failed:", error, {
      url: requestUrl,
      lat,
      lon,
    });
    return null;
  }
}

export async function searchNominatim(
  query: string,
  opts: NominatimSearchOptions = {}
): Promise<Array<{ id: string; label: string; lat: number; lon: number }>> {
  const q = query.trim();
  if (!q) return [];

  const {
    signal,
    language = "en",
    baseUrl = import.meta.env.VITE_NOMINATIM_BASE ||
      "https://nominatim.openstreetmap.org",
    limit = 5,
    countrycodes,
    viewbox,
    bounded,
  } = opts;

  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("accept-language", language);
  if (countrycodes) url.searchParams.set("countrycodes", countrycodes);
  if (viewbox) url.searchParams.set("viewbox", viewbox);
  if (bounded) url.searchParams.set("bounded", bounded);
  const email = import.meta.env.VITE_NOMINATIM_EMAIL;
  if (email) url.searchParams.set("email", email);

  const requestUrl = url.toString();

  try {
    const res = await fetch(requestUrl, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error("Nominatim search failed", {
        status: res.status,
        statusText: res.statusText,
        url: requestUrl,
        response: errorText,
      });
      throw new Error(
        `Nominatim search failed with status ${res.status}: ${res.statusText}`
      );
    }

    type Payload = NominatimSearchItem[] | { error?: string; message?: string };
    const payload = (await res.json()) as Payload;

    if (!Array.isArray(payload)) {
      const errorMessage =
        payload?.error || payload?.message || "Unexpected Nominatim response";
      console.error("Nominatim search returned error payload", {
        url: requestUrl,
        error: errorMessage,
        payload,
      });
      throw new Error(errorMessage);
    }

    if (payload.length === 0) {
      return [];
    }

    const mapped = payload.map((it) => ({
      id: String(it.place_id),
      label: it.display_name,
      lat: Number(it.lat),
      lon: Number(it.lon),
    }));

    return mapped;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    // Narrow error type before accessing properties
    let errorMessage: string;
    let errorName: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorName = error.name;
    } else if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      errorMessage = error.message;
      errorName =
        "name" in error && typeof error.name === "string"
          ? error.name
          : undefined;
    } else {
      errorMessage = String(error);
      errorName = undefined;
    }

    console.error("Nominatim search request failed", {
      url: requestUrl,
      query: q,
      error: errorMessage,
      errorName,
    });
    throw error;
  }
}
