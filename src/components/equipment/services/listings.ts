import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type EquipmentPhotoRow =
  Database["public"]["Tables"]["equipment_photos"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export type Listing = EquipmentRow & {
  category: CategoryRow | null;
  photos: EquipmentPhotoRow[];
  owner: Pick<ProfileRow, "id" | "email" | "identity_verified"> | null;
  reviews?: Array<Pick<ReviewRow, "rating">>;
};

// Type helper to validate and safely cast query results
function isListingQueryResult(item: unknown): item is Omit<Listing, "reviews"> {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;

  // Validate required equipment fields
  const hasValidBasicFields =
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.owner_id === "string" &&
    typeof candidate.category_id === "string" &&
    typeof candidate.daily_rate === "number" &&
    typeof candidate.condition === "string" &&
    typeof candidate.location === "string" &&
    typeof candidate.is_available === "boolean" &&
    Array.isArray(candidate.photos);

  if (!hasValidBasicFields) return false;

  // Validate optional numeric fields (should be number or null)
  const hasValidOptionalFields =
    (candidate.latitude === null || typeof candidate.latitude === "number") &&
    (candidate.longitude === null || typeof candidate.longitude === "number");

  if (!hasValidOptionalFields) return false;

  // Validate category (should be object or null)
  const hasValidCategory =
    candidate.category === null ||
    (typeof candidate.category === "object" && candidate.category !== null);

  // Validate owner structure (should be null or have id, email, and identity_verified)
  const hasValidOwner =
    candidate.owner === null ||
    (typeof candidate.owner === "object" &&
      candidate.owner !== null &&
      "id" in candidate.owner &&
      "email" in candidate.owner &&
      "identity_verified" in candidate.owner);

  return hasValidCategory && hasValidOwner;
}

export type ListingsFilters = {
  search?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  conditions?: Database["public"]["Enums"]["equipment_condition"][];
  condition?: Database["public"]["Enums"]["equipment_condition"] | "all";
  limit?: number;
  verified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  equipmentTypeName?: string;
  equipmentCategoryId?: string;
};

export const fetchListings = async (
  filters: ListingsFilters = {},
  signal?: AbortSignal
): Promise<Listing[]> => {
  let query = supabase
    .from("equipment")
    .select(
      `*,
       category:categories(*),
       photos:equipment_photos(*),
       owner:profiles!equipment_owner_id_fkey(id,email,identity_verified)
      `
    )
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (signal) {
    query = query.abortSignal(signal);
  }

  const categoryFilter =
    filters.equipmentCategoryId ||
    (filters.categoryId && filters.categoryId !== "all"
      ? filters.categoryId
      : undefined);
  if (categoryFilter) {
    query = query.eq("category_id", categoryFilter);
  }

  if (typeof filters.priceMin === "number") {
    query = query.gte("daily_rate", filters.priceMin);
  }
  if (typeof filters.priceMax === "number") {
    query = query.lte("daily_rate", filters.priceMax);
  }

  const selectedConditions =
    filters.conditions && filters.conditions.length > 0
      ? Array.from(new Set(filters.conditions))
      : [];

  if (selectedConditions.length > 0) {
    query = query.in("condition", selectedConditions);
  } else if (filters.condition && filters.condition !== "all") {
    query = query.eq("condition", filters.condition);
  }

  if (filters.location && filters.location.trim().length > 0) {
    // Extract city name (part before first comma) for more flexible matching
    // This allows "Denver, CO" to match "Denver, Colorado" and vice versa
    // Also helps match "Pescara, PE" with "Pescara, Italy" by just matching "Pescara"
    const locationQuery = filters.location.trim();
    const cityName = locationQuery.split(',')[0].trim();

    // Sanitize city name to escape SQL LIKE pattern metacharacters (%, _, \)
    // to prevent users from altering the matching behavior
    const sanitizedCityName = cityName
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')     // Escape % wildcard
      .replace(/_/g, '\\_');    // Escape _ single-char wildcard

    // Use sanitized city name for search to be more flexible with state/region variations
    query = query.ilike("location", `%${sanitizedCityName}%`);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    // Sanitize user input to avoid PostgREST filter injection by removing
    // reserved separators used by the `.or()` filter grammar.
    // Also escape SQL LIKE metacharacters to keep search terms literal.
    const sanitized = term
      .replace(/[(),]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
    );
  }

  if (typeof filters.limit === "number" && filters.limit > 0) {
    query = query.limit(filters.limit);
  } else {
    // Default limit to prevent unbounded queries
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Validate and safely convert query results
  const validatedListings = (data || []).filter(isListingQueryResult) as Omit<
    Listing,
    "reviews"
  >[];

  if (validatedListings.length === 0) {
    return [];
  }

  let filteredListings = validatedListings;

  // Apply date availability filter if provided
  if (filters.dateFrom) {
    const from = filters.dateFrom;
    const to = filters.dateTo ?? filters.dateFrom;
    const equipmentIds = validatedListings.map((item) => item.id);
    const availabilityQuery = supabase
      .from("availability_calendar")
      .select("equipment_id")
      .gte("date", from)
      .lte("date", to)
      .eq("is_available", false)
      .in("equipment_id", equipmentIds);

    const availabilityRequest = signal
      ? availabilityQuery.abortSignal(signal)
      : availabilityQuery;

    const { data: unavailable, error: availabilityError } =
      await availabilityRequest;

    if (availabilityError) {
      console.error("Failed to load availability calendar for filters", {
        filters,
        error: availabilityError,
      });
    } else if (unavailable) {
      const unavailableIds = new Set(unavailable.map((row) => row.equipment_id));
      filteredListings = filteredListings.filter(
        (item) => !unavailableIds.has(item.id)
      );
    }
  }

  // Apply equipment type filter client-side if only the name was provided (fallback)
  // Skip this if we're doing a text search (search parameter takes precedence)
  if (!filters.equipmentCategoryId && filters.equipmentTypeName && !filters.search) {
    const target = filters.equipmentTypeName.toLowerCase();
    filteredListings = filteredListings.filter((item) => {
      const categoryName = item.category?.name?.toLowerCase();
      return categoryName ? categoryName.includes(target) : false;
    });
  }

  // Collect all unique owner IDs
  const ownerIds = [
    ...new Set(filteredListings.map((item) => item.owner?.id).filter(Boolean)),
  ] as string[];

  // Fetch all reviews in a single query
  const reviewsMap = new Map<string, Array<Pick<ReviewRow, "rating">>>();
  if (ownerIds.length > 0) {
    const reviewsQuery = signal
      ? supabase
          .from("reviews")
          .select("rating, reviewee_id")
          .in("reviewee_id", ownerIds)
          .abortSignal(signal)
      : supabase
          .from("reviews")
          .select("rating, reviewee_id")
          .in("reviewee_id", ownerIds);

    const { data: reviews, error: reviewsError } = await reviewsQuery;
    if (reviewsError) {
      // Log and continue so listings can still be rendered without reviews
      console.error("Failed to load reviews for listings", {
        ownerIds,
        error: reviewsError,
      });
    } else if (reviews) {
      // Build map from reviewee_id to reviews
      reviews.forEach((review) => {
        const existing = reviewsMap.get(review.reviewee_id) || [];
        existing.push({ rating: review.rating });
        reviewsMap.set(review.reviewee_id, existing);
      });
    }
  }

  // Map over listings once to attach reviews
  const listingsWithReviews: Listing[] = filteredListings.map((item) => {
    const reviews = item.owner?.id ? reviewsMap.get(item.owner.id) || [] : [];
    return { ...item, reviews };
  });

  let finalListings = listingsWithReviews;
  if (filters.verified) {
    finalListings = finalListings.filter(
      (listing) => listing.owner?.identity_verified === true
    );
  }

  return finalListings;
};

export const fetchListingById = async (id: string): Promise<Listing | null> => {
  const { data, error } = await supabase
    .from("equipment")
    .select(
      `*,
       category:categories(*),
       photos:equipment_photos(*),
       owner:profiles!equipment_owner_id_fkey(id,email,identity_verified)
      `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data) return null;

  // Validate the query result
  if (!isListingQueryResult(data)) {
    throw new Error("Invalid listing data received from database");
  }

  const base = data as Omit<Listing, "reviews">;
  if (!base.owner?.id) return { ...base, reviews: [] };

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", base.owner.id);

  if (reviewsError) {
    // Log and fall back to an empty reviews list to keep the page usable
    console.error("Failed to load reviews for listing", {
      listingId: id,
      ownerId: base.owner.id,
      error: reviewsError,
    });
    return { ...base, reviews: [] };
  }

  return { ...base, reviews: reviews || [] };
};
