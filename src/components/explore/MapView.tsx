import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { Listing } from "@/features/equipment/services/listings";

type Props = {
  listings: Listing[];
};

const MapView = ({ listings }: Props) => {
  return (
    <Card className="h-full w-full bg-muted flex flex-col items-center justify-center p-8 text-center">
      <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Map View</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Map integration coming soon. This will show {listings.length} listings on an interactive map.
      </p>
      <div className="mt-6 text-xs text-muted-foreground">
        Future features: clustered markers, bounds sync, click to highlight
      </div>
    </Card>
  );
};

export default MapView;
