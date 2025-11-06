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

  const listings = (data || []) as unknown as Listing[];

  // Collect all unique owner IDs
  const ownerIds = [
    ...new Set(listings.map((item) => item.owner?.id).filter(Boolean)),
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
  const listingsWithReviews = listings.map((item) => {
    const reviews = item.owner?.id ? reviewsMap.get(item.owner.id) || [] : [];
    return { ...item, reviews } as Listing;
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

  const base = data as unknown as Listing;
  if (!base.owner?.id) return { ...base, reviews: [] };

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", base.owner.id);

  return { ...base, reviews: reviews || [] };
};
