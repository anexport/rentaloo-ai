import { MapPin } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";
import { Badge } from "@/components/ui/badge";

interface EquipmentHeaderProps {
  title: string;
  location: string;
  condition: string;
  avgRating: number;
  reviewCount: number;
}

export const EquipmentHeader = ({
  title,
  location,
  condition,
  avgRating,
  reviewCount,
}: EquipmentHeaderProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {location}
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="sm" />
                <span className="font-medium">{avgRating.toFixed(1)}</span>
                {reviewCount > 0 && <span>({reviewCount})</span>}
              </div>
            )}
            <Badge variant="outline" className="capitalize">
              {condition}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

