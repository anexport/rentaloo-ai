# Global Address Autocomplete (Nominatim) — Executor Guide

This guide explains exactly how to add global address/place suggestions to the existing Explore search bar using OpenStreetMap Nominatim. It is tailored to this codebase (paths and components) and covers provider code, a cache-aware wrapper, a React hook, and UI wiring for both mobile and desktop “Where” inputs.

The result: when a user types e.g., “monte”, suggestions like “Montesilvano …” appear rapidly, without restricting to a single country, and without auto-submitting the search.

## Summary

- Provider: Nominatim forward geocoding (`/search`) with `email` identification.
- Wrapper: in-memory cache + normalized suggestion shape.
- Hook: debounced, cancelable fetching; UI-ready state.
- UI: wire into `SearchBarPopover` for mobile Sheet and desktop Popover.
- Global: do not pass `countrycodes` unless you want biasing.

## Prerequisites

- Vite env: add an email for Nominatim identification (recommended by their policy).

```env
# .env.local
VITE_NOMINATIM_EMAIL=you@example.com
# Optional: override base if self-hosted or proxying
VITE_NOMINATIM_BASE=https://nominatim.openstreetmap.org
```

- Ensure the Explore page uses `SearchBarPopover`:
  - `src/pages/ExplorePage.tsx:1`
  - `src/components/explore/SearchBarPopover.tsx:1`

## File Touch List

- `src/features/location/providers/nominatim.ts` — add forward search function and types
- `src/features/location/forwardGeocoding.ts` — new cache-aware wrapper
- `src/features/location/useAddressAutocomplete.ts` — new hook
- `src/components/explore/SearchBarPopover.tsx` — integrate suggestions in mobile + desktop Where

## 1) Provider: forward geocoding (Nominatim /search)

Edit `src/features/location/providers/nominatim.ts` and add the following types and function (keep existing reverseGeocodeNominatim as-is):

```ts
// Add near top with existing exports
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
  limit?: number;           // default 5
  countrycodes?: string;    // optional bias, e.g., "us,gb"
  viewbox?: string;         // optional bias: "left,top,right,bottom"
  bounded?: '1' | '0';
}

// Add below reverseGeocodeNominatim
export async function searchNominatim(
  query: string,
  opts: NominatimSearchOptions = {}
): Promise<Array<{ id: string; label: string; lat: number; lon: number }>> {
  const q = query.trim();
  if (!q) return [];

  const {
    signal,
    language = 'en',
    baseUrl = import.meta.env.VITE_NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
    limit = 5,
    countrycodes,
    viewbox,
    bounded,
  } = opts;

  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', q);
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('accept-language', language);
  if (countrycodes) url.searchParams.set('countrycodes', countrycodes);
  if (viewbox) url.searchParams.set('viewbox', viewbox);
  if (bounded) url.searchParams.set('bounded', bounded);
  const email = import.meta.env.VITE_NOMINATIM_EMAIL;
  if (email) url.searchParams.set('email', email);

  const requestUrl = url.toString();
  const res = await fetch(requestUrl, { signal });
  if (!res.ok) {
    console.error('Nominatim search failed', { status: res.status, url: requestUrl });
    throw new Error(`Nominatim search failed with status ${res.status}`);
  }

  type Payload = NominatimSearchItem[] | { error?: string; message?: string };
  const payload = (await res.json()) as Payload;
  if (!Array.isArray(payload)) {
    const errorMessage = payload?.error || payload?.message || 'Unexpected Nominatim response';
    console.error('Nominatim search returned error payload', { url: requestUrl, error: errorMessage });
    throw new Error(errorMessage);
  }

  return payload.map((it) => ({
    id: String(it.place_id),
    label: it.display_name,
    lat: Number(it.lat),
    lon: Number(it.lon),
  }));
}
```

Notes
- We throw on non-OK and error payloads so the UI can show meaningful errors rather than “No locations found”.
- Do not set `countrycodes` unless you intentionally want regional bias. For global suggestions, omit it.

## 2) Wrapper: cache-aware suggestions

Create `src/features/location/forwardGeocoding.ts`:

```ts
import { searchNominatim, type NominatimSearchOptions } from './providers/nominatim';

export type Suggestion = { id: string; label: string; lat: number; lon: number };

const cache = new Map<string, { ts: number; items: Suggestion[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function key(query: string, lang?: string, cc?: string) {
  return `${query.trim().toLowerCase()}|${lang || 'en'}|${cc || ''}`;
}

export async function suggestLocations(
  query: string,
  opts: NominatimSearchOptions = {}
): Promise<Suggestion[]> {
  const k = key(query, opts.language, opts.countrycodes);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.items;

  const items = await searchNominatim(query, opts);
  cache.set(k, { ts: Date.now(), items });
  return items;
}
```

## 3) Hook: debounced, cancelable autocomplete

Create `src/features/location/useAddressAutocomplete.ts`:

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { suggestLocations, type Suggestion } from './forwardGeocoding';

export function useAddressAutocomplete(params?: {
  language?: string;
  limit?: number;
  countrycodes?: string; // optional bias; omit for global
  minLength?: number;     // default 2
  debounceMs?: number;    // default 300
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const minLength = params?.minLength ?? 2;
  const debounceMs = params?.debounceMs ?? 300;

  const opts = useMemo(
    () => ({
      language: params?.language || (typeof navigator !== 'undefined' ? navigator.language : 'en'),
      limit: params?.limit ?? 5,
      countrycodes: params?.countrycodes,
    }),
    [params?.language, params?.limit, params?.countrycodes]
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const items = await suggestLocations(q, { ...opts, signal: ctrl.signal });
        setSuggestions(items);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setSuggestions([]);
          setError(e?.message ?? 'Failed to load suggestions');
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, opts.language, opts.limit, opts.countrycodes, minLength, debounceMs]);

  return { query, setQuery, suggestions, loading, error };
}
```

## 4) UI: wire into SearchBarPopover (mobile + desktop)

Edit `src/components/explore/SearchBarPopover.tsx`.

- Import the hook:

```ts
import { useAddressAutocomplete } from '@/features/location/useAddressAutocomplete';
```

- Initialize once in the component (global suggestions; do not set `countrycodes`):

```ts
const addressAutocomplete = useAddressAutocomplete({ limit: 10, minLength: 2, debounceMs: 100 });
```

- Mobile “Where” section (Sheet): find the mobile Where block where `Command` is used (around the Where section content). Replace the existing `Command` usage to bind `value` and `onValueChange` on the root `Command`, not `CommandInput`. Only show Suggestions when a query is present.

```tsx
<Command className="rounded-2xl border" value={addressAutocomplete.query} onValueChange={addressAutocomplete.setQuery}>
  <CommandInput placeholder="Try Yosemite National Park" />
  <CommandList aria-busy={addressAutocomplete.loading}>
    <CommandEmpty>
      {addressAutocomplete.loading
        ? 'Searching...'
        : addressAutocomplete.query.trim().length === 0
          ? 'Start typing to search locations.'
          : addressAutocomplete.error ?? 'No locations found.'}
    </CommandEmpty>
    {addressAutocomplete.query.trim().length > 0 && addressAutocomplete.suggestions.length > 0 && (
      <CommandGroup heading="Suggestions">
        {addressAutocomplete.suggestions.map((s) => (
          <CommandItem
            key={s.id}
            onSelect={() => {
              handleLocationSelect(s.label);
              addressAutocomplete.setQuery('');
            }}
            className="cursor-pointer"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {s.label}
          </CommandItem>
        ))}
      </CommandGroup>
    )}
    <CommandGroup heading="Popular">
      {POPULAR_LOCATIONS.map((loc) => (
        <CommandItem key={loc} onSelect={() => handleLocationSelect(loc)} className="cursor-pointer">
          <MapPin className="mr-2 h-4 w-4" />
          {loc}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
  </Command>
```

- Desktop “Where” popover: find the desktop `PopoverContent` for Where. Use the same `Command` pattern as above (bind on the root, show Suggestions only with a query). Optionally clear the query when the popover opens to avoid stale suggestions:

```tsx
<Popover
  open={locationOpen}
  onOpenChange={(open) => {
    setLocationOpen(open);
    if (open) addressAutocomplete.setQuery('');
  }}
>
  <PopoverTrigger asChild> ... </PopoverTrigger>
  <PopoverContent className="w-80 p-0" align="start">
    <div className="p-3 border-b"> ... Use current location button ... </div>
    <Command value={addressAutocomplete.query} onValueChange={addressAutocomplete.setQuery}>
      <CommandInput placeholder="Search locations..." />
      <CommandList aria-busy={addressAutocomplete.loading}>
        <CommandEmpty>
          {addressAutocomplete.loading
            ? 'Searching...'
            : addressAutocomplete.query.trim().length === 0
              ? 'Start typing to search locations.'
              : addressAutocomplete.error ?? 'No locations found.'}
        </CommandEmpty>
        {addressAutocomplete.query.trim().length > 0 && addressAutocomplete.suggestions.length > 0 && (
          <CommandGroup heading="Suggestions">
            {addressAutocomplete.suggestions.map((s) => (
              <CommandItem
                key={s.id}
                onSelect={() => {
                  handleLocationSelect(s.label);
                  addressAutocomplete.setQuery('');
                }}
                className="cursor-pointer"
              >
                <MapPin className="mr-2 h-4 w-4" />
                {s.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Popular destinations"> ... existing items ... </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Important
- Bind `value` and `onValueChange` on the root `Command` (CMDK’s design). Do not bind them on `CommandInput`.
- Do not hardcode `countrycodes: 'us'` if you want global results.
- Do not auto-submit on selection; just set `location` and let the user press Search.

## 5) Verification Checklist

- Open Explore.
- Mobile: open the search sheet, go to Where; Desktop: open Where popover.
- Start typing “monte”. Within ~300ms after stopping, a Suggestions group appears with global results (e.g., “Montesilvano …”).
- Selecting a suggestion sets the Where field and closes the list but does not run a search.
- Clearing and reopening the Where UI shows no stale suggestions until you type.
- Network tab shows requests to `/search?format=jsonv2&q=monte...&email=...` returning 200.

## 6) Troubleshooting

- Empty suggestions while typing:
  - Confirm `.env.local` has `VITE_NOMINATIM_EMAIL` and you restarted dev server.
  - Check browser console for “Nominatim search failed … status 403/429” or an error payload message.
  - Reduce typing speed during initial tests; Nominatim rate limits are strict.
  - Ensure suggestions only render when `query.trim().length >= 2` to avoid too-broad queries.

- Suggestions appear before typing:
  - Make sure the popover/sheet `onOpenChange` clears `addressAutocomplete.setQuery('')` when opening.
  - Gate suggestions by `query.trim().length > 0`.

- CORS/Network errors:
  - Verify requests target `https://nominatim.openstreetmap.org` (or your proxy) and are not blocked.
  - If needed, add a backend proxy with caching and rate limiting.

## 7) Compliance Notes (Nominatim)

- Identify your app via `Referer` and the `email` query param.
- Be gentle: debounce, cancel in-flight requests, and cache responses.
- Limit results (5–7 items) to reduce load and visual noise.

---

By following this guide, you’ll have global address autocomplete integrated into the existing search UI, with clean UX on both mobile and desktop, robust error handling, and compliance with Nominatim’s usage policy.

