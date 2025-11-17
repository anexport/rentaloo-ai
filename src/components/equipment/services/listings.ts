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
  owner: Pick<ProfileRow, "id" | "email"> | null;
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

  // Validate owner structure (should be null or have id and email)
  const hasValidOwner =
    candidate.owner === null ||
    (typeof candidate.owner === "object" &&
      candidate.owner !== null &&
      "id" in candidate.owner &&
      "email" in candidate.owner);

  return hasValidCategory && hasValidOwner;
}

export type ListingsFilters = {
  search?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  condition?: Database["public"]["Enums"]["equipment_condition"] | "all";
};

export const fetchListings = async (
  filters: ListingsFilters = {}
): Promise<Listing[]> => {
  let query = supabase
    .from("equipment")
    .select(
      `*,
       category:categories(*),
       photos:equipment_photos(*),
       owner:profiles!equipment_owner_id_fkey(id,email)
      `
    )
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (filters.categoryId && filters.categoryId !== "all") {
    query = query.eq("category_id", filters.categoryId);
  }

  if (typeof filters.priceMin === "number") {
    query = query.gte("daily_rate", filters.priceMin);
  }
  if (typeof filters.priceMax === "number") {
    query = query.lte("daily_rate", filters.priceMax);
  }

  if (filters.condition && filters.condition !== "all") {
    query = query.eq("condition", filters.condition);
  }

  if (filters.location && filters.location.trim().length > 0) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    // Sanitize user input to avoid PostgREST filter injection by removing
    // reserved separators used by the `.or()` filter grammar.
    const sanitized = term.replace(/[(),]/g, "");
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Validate and safely convert query results
  const validatedListings = (data || []).filter(isListingQueryResult) as Omit<
    Listing,
    "reviews"
  >[];

  // Collect all unique owner IDs
  const ownerIds = [
    ...new Set(validatedListings.map((item) => item.owner?.id).filter(Boolean)),
  ] as string[];

  // Fetch all reviews in a single query
  const reviewsMap = new Map<string, Array<Pick<ReviewRow, "rating">>>();
  if (ownerIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating, reviewee_id")
      .in("reviewee_id", ownerIds);

    // Build map from reviewee_id to reviews
    if (reviews) {
      reviews.forEach((review) => {
        const existing = reviewsMap.get(review.reviewee_id) || [];
        existing.push({ rating: review.rating });
        reviewsMap.set(review.reviewee_id, existing);
      });
    }
  }

  // Map over listings once to attach reviews
  const listingsWithReviews: Listing[] = validatedListings.map((item) => {
    const reviews = item.owner?.id ? reviewsMap.get(item.owner.id) || [] : [];
    return { ...item, reviews };
  });

  return listingsWithReviews;
};

export const fetchListingById = async (id: string): Promise<Listing | null> => {
  const { data, error } = await supabase
    .from("equipment")
    .select(
      `*,
       category:categories(*),
       photos:equipment_photos(*),
       owner:profiles!equipment_owner_id_fkey(id,email)
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", base.owner.id);

  return { ...base, reviews: reviews || [] };
};
