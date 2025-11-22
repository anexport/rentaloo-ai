import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ClaimResponseForm from "@/components/claims/ClaimResponseForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import type { ClaimStatus } from "@/types/claim";

interface ClaimDetails {
  id: string;
  booking_id: string;
  damage_description: string;
  estimated_cost: number;
  evidence_photos: string[];
  repair_quotes: string[];
  status: ClaimStatus;
  filed_at: string;
  booking: {
    renter_id: string;
    equipment: {
      title: string;
    };
  };
}

export default function ReviewClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [claim, setClaim] = useState<ClaimDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClaim = async () => {
      if (!claimId || !user) {
        setError("Invalid claim or not authenticated");
        setLoading(false);
        return;
      }

      try {
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
            booking:booking_requests(
              renter_id,
              equipment:equipment(title)
            )
          `
          )
          .eq("id", claimId)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Claim not found");
          setLoading(false);
          return;
        }

        const booking = data.booking as ClaimDetails["booking"];

        // Check if user is the renter
        if (booking?.renter_id !== user.id) {
          setError("You are not authorized to review this claim");
          setLoading(false);
          return;
        }

        setClaim({
          ...data,
          booking,
        } as ClaimDetails);
      } catch (err) {
        console.error("Error fetching claim:", err);
        setError("Failed to load claim details");
      } finally {
        setLoading(false);
      }
    };

    fetchClaim();
  }, [claimId, user]);

  const handleSuccess = () => {
    navigate("/renter/dashboard");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Something went wrong"}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Review Damage Claim</CardTitle>
            <p className="text-sm text-muted-foreground">
              {claim.booking?.equipment?.title}
            </p>
          </CardHeader>
          <CardContent>
            <ClaimResponseForm
              claim={claim}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
