import { CalendarIcon, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import EquipmentLocationMap from "../EquipmentLocationMap";

interface DetailsTabProps {
  equipmentId: string;
  dailyRate: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * DetailsTab combines availability calendar and location map
 * into a single tab for better information grouping.
 */
export const DetailsTab = ({
  equipmentId,
  dailyRate,
  location,
  latitude,
  longitude,
}: DetailsTabProps) => {
  return (
    <div className="space-y-8">
      {/* Availability Section */}
      <section aria-labelledby="availability-heading">
        <h3
          id="availability-heading"
          className="text-lg font-semibold mb-4 flex items-center gap-2"
        >
          <CalendarIcon className="h-5 w-5 text-primary" />
          Availability Calendar
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select dates in the sidebar to see pricing and book this equipment.
        </p>
        <AvailabilityCalendar
          equipmentId={equipmentId}
          defaultDailyRate={dailyRate}
          viewOnly={true}
        />
      </section>

      <Separator className="my-6" />

      {/* Location Section */}
      <section aria-labelledby="location-heading">
        <h3
          id="location-heading"
          className="text-lg font-semibold mb-4 flex items-center gap-2"
        >
          <MapPin className="h-5 w-5 text-primary" />
          Location
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pickup and return location for this equipment.
        </p>
        <EquipmentLocationMap
          location={location}
          latitude={latitude}
          longitude={longitude}
        />
      </section>
    </div>
  );
};

