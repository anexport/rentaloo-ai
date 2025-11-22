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
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Prefetch categories
    const prefetchCategories = async () => {
      if (signal.aborted) return;
      await queryClient.prefetchQuery({
        queryKey: ["categories"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .is("parent_id", null)
            .order("name")
            .abortSignal(signal);

          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
      });
    };

    // Prefetch featured/popular listings
    const prefetchFeaturedListings = async () => {
      if (signal.aborted) return;
      await queryClient.prefetchQuery({
        queryKey: ["featured-listings"],
        queryFn: () => fetchListings({ limit: 4 }, signal),
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    };

    // Prefetch default listings (first page)
    const prefetchDefaultListings = async () => {
      if (signal.aborted) return;
      await queryClient.prefetchQuery({
        queryKey: ["listings", {}],
        queryFn: () => fetchListings({}, signal),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    };

    // Run prefetches in parallel with error handling
    void Promise.all([
      prefetchCategories().catch((err) => {
        if (!signal.aborted) {
          console.error("Failed to prefetch categories:", err);
        }
      }),
      prefetchFeaturedListings().catch((err) => {
        if (!signal.aborted) {
          console.error("Failed to prefetch featured listings:", err);
        }
      }),
      prefetchDefaultListings().catch((err) => {
        if (!signal.aborted) {
          console.error("Failed to prefetch default listings:", err);
        }
      }),
    ]);

    return () => {
      abortController.abort();
    };
  }, [queryClient]);
};
