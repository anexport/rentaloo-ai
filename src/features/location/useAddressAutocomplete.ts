import { useEffect, useMemo, useRef, useState } from 'react';
import { suggestLocations, getCachedSuggestions, type Suggestion } from './forwardGeocoding';

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

    // Check cache immediately for instant results (no debounce for cached)
    const cached = getCachedSuggestions(q, { language: opts.language, countrycodes: opts.countrycodes });
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setError(null);
      return; // Return early for cached results - instant display!
    }

    // No cache hit - fetch with minimal debounce
    setLoading(true);
    setError(null);
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    // Use requestAnimationFrame for smoother UX, then minimal timeout
    const t = setTimeout(async () => {
      try {
        const items = await suggestLocations(q, { ...opts, signal: ctrl.signal });
        if (!ctrl.signal.aborted) {
          console.log(`[Autocomplete] Query: "${q}", Results: ${items.length}`, items);
          setSuggestions(items);
          if (items.length === 0) {
            setError(null);
            console.log(`[Autocomplete] No results for "${q}"`);
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError' && !ctrl.signal.aborted) {
          console.error(`[Autocomplete] Error for "${q}":`, e);
          setSuggestions([]);
          setError(e?.message ?? 'Failed to load suggestions');
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

