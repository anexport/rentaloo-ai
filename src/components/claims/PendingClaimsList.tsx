import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ClaimReviewCard from "@/components/claims/ClaimReviewCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import type { ClaimStatus } from "@/types/claim";

interface PendingClaim {
  id: string;
  damage_description: string;
  estimated_cost: number;
  evidence_photos: string[];
  repair_quotes: string[];
  status: ClaimStatus;
  filed_at: string;
  booking: {
    equipment: {
      title: string;
    };
  };
}

export default function PendingClaimsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClaims = async () => {
      if (!user) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("damage_claims")
          .select(
            `
            id,
            damage_description,
            estimated_cost,
            evidence_photos,
            repair_quotes,
            status,
            filed_at,
            booking:booking_requests!inner(
              renter_id,
              equipment:equipment(title)
            )
          `
          )
          .eq("booking.renter_id", user.id)
          .in("status", ["pending", "disputed"])
          .order("filed_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to match our interface
        const transformedClaims = (data || []).map((claim) => ({
          ...claim,
          booking: claim.booking as PendingClaim["booking"],
        }));

        setClaims(transformedClaims);
      } catch (err) {
        console.error("Error fetching claims:", err);
        setError("Failed to load claims");
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("renter-claims")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "damage_claims",
        },
        () => {
          fetchClaims();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (claims.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold">Damage Claims Requiring Action</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {claims.map((claim) => (
          <ClaimReviewCard
            key={claim.id}
            claim={claim}
            onReview={() => navigate(`/claims/review/${claim.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
