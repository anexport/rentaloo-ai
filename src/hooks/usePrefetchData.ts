import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchListings } from "@/components/equipment/services/listings";

/**
 * Prefetches critical data on app mount to improve perceived performance
 */
export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch categories
    const prefetchCategories = async () => {
      await queryClient.prefetchQuery({
        queryKey: ["categories"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .is("parent_id", null)
            .order("name");

          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
      });
    };

    // Prefetch featured/popular listings
    const prefetchFeaturedListings = async () => {
      await queryClient.prefetchQuery({
        queryKey: ["featured-listings"],
        queryFn: () => fetchListings({ limit: 4 }),
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    };

    // Prefetch default listings (first page)
    const prefetchDefaultListings = async () => {
      await queryClient.prefetchQuery({
        queryKey: ["listings", {}],
        queryFn: () => fetchListings({}),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    };

    // Run prefetches in parallel
    void Promise.all([
      prefetchCategories(),
      prefetchFeaturedListings(),
      prefetchDefaultListings(),
    ]);
  }, [queryClient]);
};
