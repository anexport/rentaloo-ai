import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];

export type EquipmentSuggestion = {
  id: string;
  label: string;
  type: "category" | "equipment";
  categoryId?: string;
  categoryName?: string;
  /** Number of available items (for categories: equipment count; for equipment: undefined) */
  itemCount?: number;
};

type CacheEntry = {
  ts: number;
  items: EquipmentSuggestion[];
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedSuggestions(
  query: string
): EquipmentSuggestion[] | null {
  const key = query.trim().toLowerCase();
  const entry = cache.get(key);

  if (!entry) return null;

  const age = Date.now() - entry.ts;
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.items;
}

function setCachedSuggestions(
  query: string,
  items: EquipmentSuggestion[]
): void {
  const key = query.trim().toLowerCase();
  cache.set(key, { ts: Date.now(), items });
}

export async function suggestEquipment(
  query: string,
  opts: {
    categoryLimit?: number;
    equipmentLimit?: number;
    signal?: AbortSignal;
  } = {}
): Promise<EquipmentSuggestion[]> {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return [];
  }

  // Check cache first
  const cached = getCachedSuggestions(trimmed);
  if (cached) {
    return cached;
  }

  // Sanitize input to prevent SQL injection
  // Escape LIKE wildcards: %, _, and escape character \
  const sanitized = trimmed
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/%/g, "\\%") // Escape % wildcard
    .replace(/_/g, "\\_"); // Escape _ single-char wildcard

  const categoryLimit = opts.categoryLimit ?? 5;
  const equipmentLimit = opts.equipmentLimit ?? 10;

  try {
    // Query categories, pre-aggregated counts (from view), and equipment items in parallel
    // The view `available_equipment_counts_by_category` provides server-side aggregated counts,
    // avoiding PostgREST's row cap and reducing bandwidth/CPU usage.
    const [categoriesResult, availableCountsResult, equipmentResult] =
      await Promise.all([
        // Query 1: Get matching categories
        (async () => {
          let categoryQuery = supabase
            .from("categories")
            .select("id, name")
            .ilike("name", `%${sanitized}%`)
            .limit(categoryLimit);

          if (opts.signal) {
            categoryQuery = categoryQuery.abortSignal(opts.signal);
          }

          return categoryQuery;
        })(),

        // Query 2: Get pre-aggregated counts from the database view
        // This returns {category_id, available_count} already grouped and counted server-side
        (async () => {
          let countQuery = supabase
            .from("available_equipment_counts_by_category")
            .select("category_id, available_count");

          if (opts.signal) {
            countQuery = countQuery.abortSignal(opts.signal);
          }

          return countQuery;
        })(),

        // Query 3: Get matching equipment items
        (async () => {
          let equipmentQuery = supabase
            .from("equipment")
            .select(
              `
            id,
            title,
            category_id,
            category:categories(name)
          `
            )
            .ilike("title", `%${sanitized}%`)
            .eq("is_available", true)
            .limit(equipmentLimit);

          if (opts.signal) {
            equipmentQuery = equipmentQuery.abortSignal(opts.signal);
          }

          return equipmentQuery;
        })(),
      ]);

    // Build a map of category_id -> count from pre-aggregated view data
    const availableCountMap = new Map<string, number>();
    if (availableCountsResult.data) {
      availableCountsResult.data.forEach(
        (row: { category_id: string; available_count: number }) => {
          availableCountMap.set(row.category_id, row.available_count);
        }
      );
    }

    // Handle category results - merge with available counts
    const categories: EquipmentSuggestion[] = [];
    if (categoriesResult.data) {
      categoriesResult.data.forEach((cat) => {
        // Get count from our pre-computed map (defaults to 0 for categories with no available items)
        const itemCount = availableCountMap.get(cat.id) ?? 0;

        categories.push({
          id: cat.id,
          label: cat.name,
          type: "category",
          itemCount,
        });
      });
    }

    // Log category errors but don't fail
    if (categoriesResult.error && !opts.signal?.aborted) {
      console.error(
        "[Equipment Autocomplete] Error fetching categories:",
        categoriesResult.error
      );
    }

    // Log count errors but don't fail
    if (availableCountsResult.error && !opts.signal?.aborted) {
      console.error(
        "[Equipment Autocomplete] Error fetching available counts:",
        availableCountsResult.error
      );
    }

    // Handle equipment results
    const equipment: EquipmentSuggestion[] = [];
    if (equipmentResult.data) {
      equipmentResult.data.forEach((item) => {
        const eq = item as EquipmentRow & {
          category: CategoryRow | null;
        };

        equipment.push({
          id: eq.id,
          label: eq.title,
          type: "equipment",
          categoryId: eq.category_id ?? undefined,
          categoryName: eq.category?.name ?? undefined,
        });
      });
    }

    // Log equipment errors but don't fail
    if (equipmentResult.error && !opts.signal?.aborted) {
      console.error(
        "[Equipment Autocomplete] Error fetching equipment:",
        equipmentResult.error
      );
    }

    // Merge results: categories first, then equipment
    const results = [...categories, ...equipment];

    // Cache the results
    setCachedSuggestions(trimmed, results);

    return results;
  } catch (error) {
    // Handle unexpected errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      // Request was aborted, return empty array silently
      return [];
    }

    console.error("[Equipment Autocomplete] Unexpected error:", error);
    return [];
  }
}
