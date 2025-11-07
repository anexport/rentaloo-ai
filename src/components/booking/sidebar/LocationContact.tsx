import { MapPin } from "lucide-react";

interface LocationContactProps {
  location: string;
  contactMessage?: string;
}

const LocationContact = ({
  location,
  contactMessage = "Contact the owner to arrange pickup after booking.",
}: LocationContactProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2" aria-label="Pickup location">
        <h4 className="text-sm font-semibold">Pickup Location</h4>
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {location}
        </p>
      </div>

      <div className="space-y-2" aria-label="Contact information">
        <h4 className="text-sm font-semibold">Contact</h4>
        <p className="text-sm text-muted-foreground">{contactMessage}</p>
      </div>
    </div>
  );
};

export default LocationContact;

