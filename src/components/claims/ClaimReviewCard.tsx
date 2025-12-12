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
import type { ClaimStatus } from "@/types/claim";

interface ClaimReviewCardProps {
  claim: {
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
  };
  onReview: () => void;
}

const getStatusColor = (status: ClaimStatus) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
      return "bg-green-100 text-green-800";
    case "disputed":
      return "bg-orange-100 text-orange-800";
    case "resolved":
      return "bg-blue-100 text-blue-800";
    case "escalated":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: ClaimStatus) => {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "accepted":
      return "Accepted";
    case "disputed":
      return "Disputed";
    case "resolved":
      return "Resolved";
    case "escalated":
      return "Escalated";
    default:
      return status;
  }
};

export default function ClaimReviewCard({
  claim,
  onReview,
}: ClaimReviewCardProps) {
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
          <Badge className={getStatusColor(claim.status)}>
            {getStatusText(claim.status)}
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
            <span>{claim.evidence_photos.length} photos</span>
          </div>
          {claim.repair_quotes.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{claim.repair_quotes.length} quotes</span>
            </div>
          )}
        </div>

        {claim.status === "pending" && (
          <Button onClick={onReview} className="w-full">
            Review & Respond
          </Button>
        )}

        {claim.status !== "pending" && (
          <Button onClick={onReview} variant="outline" className="w-full">
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
