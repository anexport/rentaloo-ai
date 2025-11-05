import { searchNominatim, type NominatimSearchOptions } from './providers/nominatim';

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
  opts: NominatimSearchOptions = {}
): Promise<Suggestion[]> {
  const cached = getCachedSuggestions(query, opts);
  if (cached) return cached;

  const k = key(query, opts.language, opts.countrycodes);
  const items = await searchNominatim(query, opts);
  cache.set(k, { ts: Date.now(), items });
  return items;
}

