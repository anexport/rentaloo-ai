import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadGoogleMaps, importMarkerLibrary, geocodeAddress } from "@/lib/googleMapsLoader";

type EquipmentLocationMapProps = {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  /** Equipment title for info window */
  equipmentTitle?: string;
};

type MapState = "loading" | "ready" | "error" | "no-api-key" | "no-location";

const EquipmentLocationMap = ({
  location,
  latitude,
  longitude,
  equipmentTitle,
}: EquipmentLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const [mapState, setMapState] = useState<MapState>("loading");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null
  );

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Geocode address if no coordinates provided
  useEffect(() => {
    const fetchCoordinates = async () => {
      if (coordinates || !location || !apiKey) return;

      try {
        const result = await geocodeAddress(location, apiKey);
        if (result) {
          setCoordinates(result);
        } else {
          setMapState("no-location");
        }
      } catch {
        setMapState("no-location");
      }
    };

    fetchCoordinates();
  }, [location, coordinates, apiKey]);

  // Initialize the map
  const initializeMap = useCallback(async () => {
    if (!apiKey) {
      setMapState("no-api-key");
      return;
    }

    if (!coordinates) {
      // Wait for geocoding to complete
      return;
    }

    if (!mapRef.current) return;

    try {
      // Load Google Maps API
      await loadGoogleMaps({
        apiKey,
        libraries: ["places", "marker"],
      });

      // Create the map
      // Note: When using mapId for Advanced Markers, styles are controlled via Google Cloud Console
      const map = new google.maps.Map(mapRef.current, {
        center: coordinates,
        zoom: 15,
        mapId: "equipment-location-map", // Required for Advanced Markers
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
      });

      mapInstanceRef.current = map;

      // Import marker library and create marker
      const { AdvancedMarkerElement, PinElement } = await importMarkerLibrary();

      // Create custom pin
      const pin = new PinElement({
        background: "#ef4444", // Red color
        borderColor: "#b91c1c",
        glyphColor: "#ffffff",
        scale: 1.2,
      });

      // Create the marker
      const marker = new AdvancedMarkerElement({
        map,
        position: coordinates,
        title: equipmentTitle || "Pickup Location",
        content: pin.element,
      });

      markerRef.current = marker;

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(equipmentTitle, location),
        ariaLabel: equipmentTitle || "Pickup Location",
      });

      infoWindowRef.current = infoWindow;

      // Show info window on marker click - store listener for cleanup
      clickListenerRef.current = marker.addListener("click", () => {
        infoWindow.open({
          anchor: marker,
          map,
        });
      });

      setMapState("ready");
    } catch (error) {
      console.error("Failed to initialize map:", error);
      setMapState("error");
    }
  }, [apiKey, coordinates, equipmentTitle, location]);

  // Initialize map when coordinates are available
  useEffect(() => {
    if (coordinates && mapState === "loading") {
      initializeMap();
    }
  }, [coordinates, mapState, initializeMap]);

  // Cleanup on unmount - dispose all Google Maps resources to prevent memory leaks
  useEffect(() => {
    return () => {
      // 1. Remove click listener from marker
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }

      // 2. Close and dispose info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }

      // 3. Remove marker from map and clear its listeners
      if (markerRef.current) {
        // Clear any remaining listeners on the marker
        google.maps.event.clearInstanceListeners(markerRef.current);
        // Remove marker from map
        markerRef.current.map = null;
        markerRef.current = null;
      }

      // 4. Clear map instance listeners and release reference
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle opening directions in Google Maps
  const handleGetDirections = () => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Render based on state
  if (mapState === "no-api-key") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <PlaceholderMap location={location} message="Map unavailable" />
          <LocationDetails location={location} />
        </CardContent>
      </Card>
    );
  }

  if (mapState === "no-location") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <PlaceholderMap location={location} message="Could not locate address on map" />
          <LocationDetails location={location} />
        </CardContent>
      </Card>
    );
  }

  if (mapState === "error") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-64 w-full bg-muted flex flex-col items-center justify-center border-b border-border">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load map</p>
          </div>
          <LocationDetails location={location} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Map Container */}
        <div className="relative">
          {mapState === "loading" && (
            <div className="absolute inset-0 h-64 w-full bg-muted flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div
            ref={mapRef}
            className="h-64 w-full"
            role="application"
            aria-label={`Map showing pickup location: ${location}`}
          />
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
            </div>
          </div>

          {/* Get Directions Button */}
          {coordinates && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleGetDirections}
              aria-label="Get directions to pickup location"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
          )}

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

// Helper to escape HTML entities to prevent XSS attacks
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Helper function to create info window HTML content
const createInfoWindowContent = (title?: string, address?: string): string => {
  const safeTitle = title ? escapeHtml(title) : "Pickup Location";
  const safeAddress = address ? escapeHtml(address) : "";
  
  return `
    <div style="padding: 8px; max-width: 200px;">
      <h4 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px; color: #111;">
        ${safeTitle}
      </h4>
      <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
        ${safeAddress}
      </p>
    </div>
  `;
};

// Placeholder map component for fallback states
const PlaceholderMap = ({ location, message }: { location: string; message: string }) => (
  <div className="h-64 w-full bg-muted flex flex-col items-center justify-center border-b border-border relative overflow-hidden">
    {/* Grid pattern background */}
    <div className="absolute inset-0 opacity-10">
      <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
        {Array.from({ length: 64 }).map((_, i) => (
          <div
            key={i}
            className="border border-border/20"
          />
        ))}
      </div>
    </div>

    {/* Icon and message */}
    <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
      <div className="rounded-full bg-primary/10 p-4">
        <MapPin className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {location}
        </p>
      </div>
    </div>
  </div>
);

// Location details component (used in fallback states)
const LocationDetails = ({ location }: { location: string }) => (
  <div className="p-4 space-y-3">
    <div className="flex items-start gap-3">
      <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Pickup Location
        </h3>
        <p className="text-sm text-muted-foreground">{location}</p>
      </div>
    </div>
    <div className="pt-2 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Contact the owner after booking to arrange pickup details.
      </p>
    </div>
  </div>
);

export default EquipmentLocationMap;
