import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOwnerClaims } from "@/hooks/useOwnerClaims";
import ClaimReviewCard from "@/components/claims/ClaimReviewCard";

export default function OwnerClaimsList() {
  const navigate = useNavigate();
  const { claims, isLoading, error } = useOwnerClaims();

  if (isLoading) {
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
            onReview={() => navigate(`/claims/manage/${claim.id}`)}
            pendingActionLabel="View Details"
          />
        ))}
      </div>
    </div>
  );
}
