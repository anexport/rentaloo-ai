import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/components/equipment/services/listings";

/**
 * Hook for fetching and managing saved/favorite equipment listings.
 * Uses React Query for caching and automatic refetching.
 *
 * @returns Query result with saved listings data and loading/error states
 */
export const useSavedEquipment = () => {
  const { favorites, loading: favoritesLoading } = useFavorites();

  return useQuery({
    queryKey: ["saved-equipment", favorites],
    queryFn: async (): Promise<Listing[]> => {
      if (favorites.length === 0) {
        return [];
      }

      // Fetch equipment with relations
      const { data, error: fetchError } = await supabase
        .from("equipment")
        .select(
          `*,
           category:categories(*),
           photos:equipment_photos(*),
           owner:profiles!equipment_owner_id_fkey(id,email,identity_verified)
          `
        )
        .in("id", favorites)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Extract unique owner IDs for review fetching
      const ownerIds = [
        ...new Set(
          (data || [])
            .map((item) => (item.owner as { id: string } | null)?.id)
            .filter(Boolean)
        ),
      ] as string[];

      const reviewsMap = new Map<string, Array<{ rating: number }>>();

      // Fetch reviews for all owners in a single query
      if (ownerIds.length > 0) {
        const { data: reviews, error: reviewsError } = await supabase
          .from("reviews")
          .select("rating, reviewee_id")
          .in("reviewee_id", ownerIds);

        if (reviewsError) {
          console.error("Failed to fetch reviews for saved equipment:", reviewsError);
        } else if (reviews) {
          reviews.forEach((review) => {
            const existing = reviewsMap.get(review.reviewee_id) || [];
            existing.push({ rating: review.rating });
            reviewsMap.set(review.reviewee_id, existing);
          });
        }
      }

      // Merge reviews into listings
      const listingsWithReviews: Listing[] = (data || []).map((item) => {
        const owner = item.owner as { id: string } | null;
        const reviews = owner?.id ? reviewsMap.get(owner.id) || [] : [];
        return { ...item, reviews } as Listing;
      });

      return listingsWithReviews;
    },
    enabled: !favoritesLoading && favorites.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
