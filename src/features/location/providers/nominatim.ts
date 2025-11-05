export interface NominatimOptions {
  signal?: AbortSignal;
  language?: string;
  baseUrl?: string;
}

export interface NominatimResult {
  label: string;
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

    const response = await fetch(url.toString(), { signal });

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
