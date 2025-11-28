import { useEffect, useMemo, useRef, useState } from "react";
import {
  suggestEquipment,
  getCachedSuggestions,
  type EquipmentSuggestion,
} from "@/components/equipment/services/autocomplete";

export function useEquipmentAutocomplete(params?: {
  minLength?: number;
  debounceMs?: number;
  categoryLimit?: number;
  equipmentLimit?: number;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<EquipmentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const minLength = params?.minLength ?? 1;
  const debounceMs = params?.debounceMs ?? 300;

  const opts = useMemo(
    () => ({
      categoryLimit: params?.categoryLimit ?? 5,
      equipmentLimit: params?.equipmentLimit ?? 10,
    }),
    [params?.categoryLimit, params?.equipmentLimit]
  );

  useEffect(() => {
    const q = query.trim();

    // Clear suggestions if query is too short
    if (q.length < minLength) {
      // Abort any in-flight request so stale results can't repopulate after clearing
      controllerRef.current?.abort();
      controllerRef.current = null;
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache immediately for instant results (no debounce for cached)
    const cached = getCachedSuggestions(q);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setError(null);
      return; // Return early for cached results - instant display!
    }

    // No cache hit - fetch with debounce
    setLoading(true);
    setError(null);

    // Abort any previous request
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    // Debounce the fetch
    const timeout = setTimeout(async () => {
      try {
        const items = await suggestEquipment(q, {
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
          console.error(`[Equipment Autocomplete] Error for "${q}":`, e);
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
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, [query, opts, minLength, debounceMs]);

  return { query, setQuery, suggestions, loading, error };
}
