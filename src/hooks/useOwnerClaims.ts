import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/lib/database.types";
import type { ClaimStatus } from "@/types/claim";

type DamageClaimRow = Database["public"]["Tables"]["damage_claims"]["Row"];

export interface OwnerClaimWithDetails
  extends Omit<DamageClaimRow, "repair_quotes"> {
  repair_quotes: string[];
  booking: {
    equipment: {
      title: string;
    };
  };
}

interface UseOwnerClaimsResult {
  claims: OwnerClaimWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch damage claims filed by the current owner
 * that are pending or disputed (requiring action)
 */
export function useOwnerClaims(): UseOwnerClaimsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: claims = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["owner-claims", user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from("damage_claims")
        .select(
          `
          id,
          booking_id,
          damage_description,
          estimated_cost,
          evidence_photos,
          repair_quotes,
          status,
          filed_at,
          filed_by,
          renter_response,
          resolution,
          created_at,
          updated_at,
          booking:booking_requests(
            equipment:equipment(title)
          )
        `
        )
        .eq("filed_by", user.id)
        .in("status", ["pending", "disputed"] satisfies ClaimStatus[])
        .order("filed_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data with proper type handling
      return (data ?? []).map((claim) => {
        const typedClaim = claim as typeof claim & {
          booking: { equipment: { title: string } } | null;
        };

        return {
          id: typedClaim.id,
          booking_id: typedClaim.booking_id,
          damage_description: typedClaim.damage_description,
          estimated_cost: typedClaim.estimated_cost,
          evidence_photos: typedClaim.evidence_photos,
          repair_quotes: typedClaim.repair_quotes ?? [],
          status: typedClaim.status,
          filed_at: typedClaim.filed_at,
          filed_by: typedClaim.filed_by,
          renter_response: typedClaim.renter_response,
          resolution: typedClaim.resolution,
          created_at: typedClaim.created_at,
          updated_at: typedClaim.updated_at,
          booking: typedClaim.booking ?? { equipment: { title: "Unknown" } },
        } satisfies OwnerClaimWithDetails;
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Subscribe to real-time updates and invalidate query
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`owner-claims-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "damage_claims",
          filter: `filed_by=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["owner-claims", user.id],
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIPTION_ERROR") {
          console.error("Failed to subscribe to owner claims updates");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    claims,
    isLoading,
    error: error?.message ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}
