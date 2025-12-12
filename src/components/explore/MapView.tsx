import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import type { Listing } from "@/components/equipment/services/listings";
import {
  loadGoogleMaps,
  importMarkerLibrary,
  geocodeAddress,
} from "@/lib/googleMapsLoader";
import { cn } from "@/lib/utils";

type Props = {
  listings: Listing[];
  selectedListingId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  onOpenListing?: (listing: Listing) => void;
  className?: string;
};

type MapState = "loading" | "ready" | "error" | "no-api-key";

type MarkerEntry = {
  listing: Listing;
  marker: google.maps.marker.AdvancedMarkerElement;
  coords: { lat: number; lng: number };
  clickListener: google.maps.MapsEventListener;
};

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }; // US center fallback

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const MapView = ({
  listings,
  selectedListingId,
  onSelectListing,
  onOpenListing,
  className,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const markerLibraryRef = useRef<{
    AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    PinElement: typeof google.maps.marker.PinElement;
  } | null>(null);
  const [mapState, setMapState] = useState<MapState>("loading");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const listingsWithCoords = useMemo(() => {
    return listings
      .filter(
        (l) =>
          typeof l.latitude === "number" &&
          typeof l.longitude === "number" &&
          Number.isFinite(l.latitude) &&
          Number.isFinite(l.longitude)
      )
      .map((l) => ({
        listing: l,
        coords: { lat: l.latitude as number, lng: l.longitude as number },
      }));
  }, [listings]);

  const hasMapMarkers = listingsWithCoords.length > 0;

  const computeInitialCenter = useCallback(async (): Promise<{
    lat: number;
    lng: number;
  }> => {
    if (listingsWithCoords.length > 0) return listingsWithCoords[0].coords;
    const firstLocation = listings[0]?.location;
    if (!firstLocation || !apiKey) return DEFAULT_CENTER;
    const geocoded = await geocodeAddress(firstLocation, apiKey);
    return geocoded ?? DEFAULT_CENTER;
  }, [apiKey, listings, listingsWithCoords]);

  const getMarkerLibrary = useCallback(async () => {
    if (markerLibraryRef.current) return markerLibraryRef.current;
    try {
      const lib = await importMarkerLibrary();
      markerLibraryRef.current = lib;
      return lib;
    } catch (error) {
      console.error("Failed to import Google Maps marker library:", error);
      throw error;
    }
  }, []);

  const createInfoWindowContent = useCallback((listing: Listing) => {
    const safeTitle = escapeHtml(listing.title);
    const safeLocation = escapeHtml(listing.location);
    const photoUrl = listing.photos?.[0]?.photo_url;

    return `
      <div style="max-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
        ${
          photoUrl
            ? `<img src="${escapeHtml(
                photoUrl
              )}" alt="${safeTitle}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
            : ""
        }
        <div style="font-weight: 600; font-size: 14px; color: #111; margin-bottom: 4px;">${safeTitle}</div>
        <div style="font-size: 12px; color: #666; margin-bottom: 6px;">${safeLocation}</div>
        <div style="font-size: 14px; font-weight: 700; color: #111; margin-bottom: 8px;">$${
          listing.daily_rate
        }/day</div>
        <button data-listing-id="${
          listing.id
        }" style="width: 100%; padding: 8px 10px; background: #111827; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">
          View details / Book
        </button>
      </div>
    `;
  }, []);

  const openInfoWindowForListing = useCallback(
    (entry: MarkerEntry) => {
      if (!mapInstanceRef.current) return;
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      infoWindowRef.current.setContent(createInfoWindowContent(entry.listing));
      infoWindowRef.current.open({
        anchor: entry.marker,
        map: mapInstanceRef.current,
      });

      google.maps.event.addListenerOnce(
        infoWindowRef.current,
        "domready",
        () => {
          const button = document.querySelector<HTMLButtonElement>(
            `button[data-listing-id="${entry.listing.id}"]`
          );
          if (button) {
            button.onclick = () => onOpenListing?.(entry.listing);
          }
        }
      );
    },
    [createInfoWindowContent, onOpenListing]
  );

  const initializeMap = useCallback(async () => {
    if (!apiKey) {
      setMapState("no-api-key");
      return;
    }
    if (!mapRef.current) return;

    try {
      await loadGoogleMaps({
        apiKey,
        libraries: ["places", "marker"],
      });
      await getMarkerLibrary();

      const center = await computeInitialCenter();
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 12,
        mapId: "explore-map",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      });

      mapInstanceRef.current = map;
      setMapState("ready");
    } catch (error) {
      console.error("Failed to initialize Explore map:", error);
      setMapState("error");
    }
  }, [apiKey, computeInitialCenter, getMarkerLibrary]);

  useEffect(() => {
    if (mapState === "loading") {
      void initializeMap();
    }
  }, [initializeMap, mapState]);

  // Avoid re-running fitBounds on selection changes (map jitter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const syncMarkers = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || mapState !== "ready") return;

    // Remove markers that no longer exist
    const nextIds = new Set(listingsWithCoords.map((l) => l.listing.id));
    for (const [id, entry] of markersRef.current.entries()) {
      if (!nextIds.has(id)) {
        entry.clickListener.remove();
        entry.marker.map = null;
        markersRef.current.delete(id);
      }
    }

    // Add/update markers
    for (const { listing, coords } of listingsWithCoords) {
      const existing = markersRef.current.get(listing.id);
      if (existing) {
        existing.coords = coords;
        existing.listing = listing;
        existing.marker.position = coords;
        existing.marker.title = listing.title;
        continue;
      }

      const { AdvancedMarkerElement, PinElement } = await getMarkerLibrary();
      const isSelected = listing.id === selectedListingId;
      const pin = new PinElement({
        background: isSelected ? "#2563eb" : "#ef4444",
        borderColor: isSelected ? "#1d4ed8" : "#b91c1c",
        glyphColor: "#ffffff",
        scale: isSelected ? 1.3 : 1.1,
      });
      const marker = new AdvancedMarkerElement({
        map,
        position: coords,
        title: listing.title,
        content: pin.element,
      });

      const clickListener = marker.addListener("click", () => {
        onSelectListing?.(listing);
        openInfoWindowForListing({
          listing,
          marker,
          coords,
          clickListener,
        } as MarkerEntry);
      });

      markersRef.current.set(listing.id, {
        listing,
        marker,
        coords,
        clickListener,
      });
    }

    if (listingsWithCoords.length === 0) {
      infoWindowRef.current?.close();
      return;
    }

    // Fit bounds to markers when listings change
    const bounds = new google.maps.LatLngBounds();
    listingsWithCoords.forEach(({ coords }) => bounds.extend(coords));
    map.fitBounds(bounds, 64);
  }, [
    getMarkerLibrary,
    listingsWithCoords,
    mapState,
    onSelectListing,
    openInfoWindowForListing,
  ]);

  useEffect(() => {
    void syncMarkers();
  }, [syncMarkers]);

  // Update marker styling + pan to selected listing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapState !== "ready") return;

    const updatePins = async () => {
      const { PinElement } = await getMarkerLibrary();
      for (const [id, entry] of markersRef.current.entries()) {
        const isSelected = id === selectedListingId;
        const pin = new PinElement({
          background: isSelected ? "#2563eb" : "#ef4444",
          borderColor: isSelected ? "#1d4ed8" : "#b91c1c",
          glyphColor: "#ffffff",
          scale: isSelected ? 1.3 : 1.1,
        });
        entry.marker.content = pin.element;
      }

      if (selectedListingId) {
        const selectedEntry = markersRef.current.get(selectedListingId);
        if (selectedEntry) {
          map.panTo(selectedEntry.coords);
          map.setZoom(Math.max(map.getZoom() ?? 12, 14));
          openInfoWindowForListing(selectedEntry);
        }
      }
    };

    void updatePins();
  }, [getMarkerLibrary, mapState, openInfoWindowForListing, selectedListingId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      for (const entry of markersRef.current.values()) {
        entry.clickListener.remove();
        entry.marker.map = null;
      }
      markersRef.current.clear();
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (mapState === "no-api-key") {
    return (
      <div
        className={cn(
          "h-full w-full bg-muted flex flex-col items-center justify-center text-center p-6",
          className
        )}
      >
        <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground max-w-md">
          Map is unavailable. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to
          enable the interactive map.
        </p>
      </div>
    );
  }

  if (mapState === "error") {
    return (
      <div
        className={cn(
          "h-full w-full bg-muted flex flex-col items-center justify-center text-center p-6",
          className
        )}
      >
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load map.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {mapState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div
        ref={mapRef}
        className="h-full w-full"
        role="application"
        aria-label="Map showing available equipment"
      />
      {mapState === "ready" && !hasMapMarkers && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/70 z-10">
          <p className="text-sm text-muted-foreground">
            No listings with map coordinates.
          </p>
        </div>
      )}
    </div>
  );
};

export default MapView;
