import { useEffect, useMemo, useRef, useState } from "react";
import {
  suggestLocations,
  getCachedSuggestions,
  type Suggestion,
} from "./forwardGeocoding";

export function useAddressAutocomplete(params?: {
  language?: string;
  limit?: number;
  countrycodes?: string; // optional bias; omit for global
  minLength?: number; // default 2
  debounceMs?: number; // default 300
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const minLength = params?.minLength ?? 2;
  const debounceMs = params?.debounceMs ?? 300;

  const opts = useMemo(() => {
    // Get API key from environment
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('VITE_GOOGLE_MAPS_API_KEY is not set');
    }

    return {
      language:
        params?.language ??
        (typeof navigator !== "undefined" ? navigator.language : "en"),
      limit: params?.limit ?? 5,
      locationBias: params?.countrycodes, // Map countrycodes to locationBias
      apiKey: apiKey || '', // Pass API key to Google provider
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
      countrycodes: opts.locationBias,
    });
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setError(null);
      return; // Return early for cached results - instant display!
    }

    // Validate API key before making request
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

    // Use requestAnimationFrame for smoother UX, then minimal timeout
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
