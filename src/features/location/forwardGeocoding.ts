import { searchGooglePlaces, type GooglePlacesAutocompleteOptions } from './providers/google';

export type Suggestion = { id: string; label: string; lat: number; lon: number };

const cache = new Map<string, { ts: number; items: Suggestion[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function key(query: string, lang?: string, locationBias?: string, limit?: number) {
  return `${query.trim().toLowerCase()}|${lang || 'en'}|${locationBias || ''}|${limit ?? 'undefined'}`;
}

export function getCachedSuggestions(
  query: string,
  opts: { language?: string; locationBias?: string; limit?: number } = {}
): Suggestion[] | null {
  const k = key(query, opts.language, opts.locationBias, opts.limit);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.items;
  return null;
}

export async function suggestLocations(
  query: string,
  opts: GooglePlacesAutocompleteOptions
): Promise<Suggestion[]> {
  const cached = getCachedSuggestions(query, {
    language: opts.language,
    locationBias: opts.locationBias,
    limit: opts.limit,
  });
  if (cached) return cached;

  const k = key(query, opts.language, opts.locationBias, opts.limit);
  const items = await searchGooglePlaces(query, opts);
  cache.set(k, { ts: Date.now(), items });
  return items;
}

