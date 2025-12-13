import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  ImageIcon,
  FileText,
} from "lucide-react";
import { getClaimStatusColor, getClaimStatusText } from "@/lib/claim";
import type { ClaimStatus } from "@/types/claim";

interface ClaimReviewCardProps {
  claim: {
    id: string;
    damage_description: string;
    estimated_cost: number;
    evidence_photos: string[];
    repair_quotes: string[] | null;
    status: ClaimStatus;
    filed_at: string;
    booking: {
      equipment: {
        title: string;
      };
    };
  };
  onReview: () => void;
  pendingActionLabel?: string;
  nonPendingActionLabel?: string;
}

export default function ClaimReviewCard({
  claim,
  onReview,
  pendingActionLabel = "Review & Respond",
  nonPendingActionLabel = "View Details",
}: ClaimReviewCardProps) {
  const evidenceCount = claim.evidence_photos?.length ?? 0;
  const repairQuoteCount = Array.isArray(claim.repair_quotes)
    ? claim.repair_quotes.length
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Damage Claim
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {claim.booking.equipment.title}
            </p>
          </div>
          <Badge className={getClaimStatusColor(claim.status)}>
            {getClaimStatusText(claim.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            Filed {formatDistanceToNow(new Date(claim.filed_at))} ago
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-destructive" />
          <span className="font-semibold text-destructive">
            ${claim.estimated_cost.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">claimed</span>
        </div>

        <p className="text-sm line-clamp-2">{claim.damage_description}</p>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" />
            <span>{evidenceCount} photos</span>
          </div>
          {repairQuoteCount > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{repairQuoteCount} quotes</span>
            </div>
          )}
        </div>

        {claim.status === "pending" && (
          <Button onClick={onReview} className="w-full">
            {pendingActionLabel}
          </Button>
        )}

        {claim.status !== "pending" && (
          <Button onClick={onReview} variant="outline" className="w-full">
            {nonPendingActionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
