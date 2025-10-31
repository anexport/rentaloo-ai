import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type EquipmentLocationMapProps = {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
};

const EquipmentLocationMap = ({
  location,
  latitude,
  longitude,
}: EquipmentLocationMapProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Map Placeholder */}
        <div className="h-64 w-full bg-muted flex flex-col items-center justify-center border-b border-border relative overflow-hidden">
          {/* Pattern background */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-border/20"
                  style={{
                    gridColumn: `${(i % 8) + 1}`,
                    gridRow: `${Math.floor(i / 8) + 1}`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Map icon and text */}
          <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
            <div className="rounded-full bg-primary/10 p-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Interactive map coming soon
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Location details available below
              </p>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Pickup Location
              </h3>
              <p className="text-sm text-muted-foreground">{location}</p>
              {latitude != null && longitude != null && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Contact the owner after booking to arrange pickup details.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentLocationMap;
