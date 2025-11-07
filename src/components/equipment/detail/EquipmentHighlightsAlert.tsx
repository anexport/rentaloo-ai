import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, TrendingUp, CheckCircle2, Star } from "lucide-react";

interface EquipmentHighlightsAlertProps {
  /**
   * Total number of times equipment has been rented
   */
  rentalCount?: number;
  
  /**
   * Average rating from renters
   */
  averageRating?: number;
  
  /**
   * Whether equipment is verified
   */
  isVerified?: boolean;
  
  /**
   * Custom highlight message
   */
  customMessage?: string;
}

export const EquipmentHighlightsAlert = ({
  rentalCount = 0,
  averageRating = 0,
  isVerified = false,
  customMessage,
}: EquipmentHighlightsAlertProps) => {
  // Determine what to highlight
  const isPopular = rentalCount >= 10;
  const isHighlyRated = averageRating >= 4.5;
  const hasNewTag = rentalCount === 0; // New item

  // Don't show if nothing to highlight
  if (!isPopular && !isHighlyRated && !isVerified && !customMessage && !hasNewTag) {
    return null;
  }

  const getIcon = () => {
    if (customMessage) return Sparkles;
    if (isHighlyRated) return Star;
    if (isPopular) return TrendingUp;
    if (hasNewTag) return Sparkles;
    return CheckCircle2;
  };

  const getTitle = () => {
    if (customMessage) return "Featured Equipment";
    if (isHighlyRated) return "Highly Rated";
    if (isPopular) return "Popular Item";
    if (hasNewTag) return "New Listing";
    if (isVerified) return "Verified Equipment";
    return "Quality Equipment";
  };

  const getDescription = () => {
    if (customMessage) return customMessage;
    
    const parts = [];
    if (isPopular) parts.push(`Rented ${rentalCount} times`);
    if (isHighlyRated) parts.push(`${averageRating.toFixed(1)} average rating`);
    if (isVerified) parts.push("Verified by owner");
    
    return parts.length > 0 
      ? `${parts.join(" • ")}. Trusted by our community!`
      : "Quality equipment ready for your next project.";
  };

  const Icon = getIcon();

  return (
    <Alert className="border-primary/50 bg-primary/5">
      <Icon className="h-4 w-4" />
      <AlertTitle>{getTitle()}</AlertTitle>
      <AlertDescription>{getDescription()}</AlertDescription>
    </Alert>
  );
};

