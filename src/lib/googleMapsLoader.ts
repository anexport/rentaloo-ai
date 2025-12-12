/**
 * Utility to load Google Maps JavaScript API dynamically
 */

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

interface GoogleMapsLoaderOptions {
  apiKey: string;
  libraries?: string[];
  language?: string;
}

let loadPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Loads Google Maps JavaScript API dynamically
 */
export const loadGoogleMaps = (options: GoogleMapsLoaderOptions): Promise<void> => {
  if (isLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      isLoaded = true;
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    const libraries = options.libraries?.length ? `&libraries=${options.libraries.join(',')}` : '';
    const language = options.language ? `&language=${options.language}` : '';
    
    // Add loading=async parameter for best practice loading
    script.src = `https://maps.googleapis.com/maps/api/js?key=${options.apiKey}${libraries}${language}&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps JavaScript API'));
    };

    // Set up callback
    window.initGoogleMaps = () => {
      isLoaded = true;
      resolve();
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

/**
 * Checks if Google Maps is loaded
 */
export const isGoogleMapsLoaded = (): boolean => {
  return isLoaded && !!window.google?.maps;
};

/**
 * Dynamically imports the Places library using the new importLibrary API
 * Returns the classes directly (Autocomplete, AutocompleteSuggestion, Place, AutocompleteSessionToken, etc.)
 * 
 * Note: Autocomplete is a widget class for attaching to input elements.
 * AutocompleteSuggestion is for programmatic access (which we use in React hooks).
 */
export const importPlacesLibrary = async (): Promise<{
  Autocomplete?: typeof google.maps.places.Autocomplete;
  AutocompleteSuggestion: typeof google.maps.places.AutocompleteSuggestion;
  Place: typeof google.maps.places.Place;
  AutocompleteSessionToken: typeof google.maps.places.AutocompleteSessionToken;
}> => {
  if (!window.google?.maps) {
    throw new Error('Google Maps must be loaded before importing Places library');
  }

  // importLibrary returns the classes directly, not under a 'places' property
  const placesLibrary = await window.google.maps.importLibrary('places');
  
  // Extract classes - Autocomplete may or may not be available depending on API version
  return {
    Autocomplete: placesLibrary.Autocomplete,
    AutocompleteSuggestion: placesLibrary.AutocompleteSuggestion,
    Place: placesLibrary.Place,
    AutocompleteSessionToken: placesLibrary.AutocompleteSessionToken,
  };
};

/**
 * Dynamically imports the Marker library for Advanced Markers
 */
export const importMarkerLibrary = async (): Promise<{
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  PinElement: typeof google.maps.marker.PinElement;
}> => {
  if (!window.google?.maps) {
    throw new Error('Google Maps must be loaded before importing Marker library');
  }

  const markerLibrary = await window.google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
  
  return {
    AdvancedMarkerElement: markerLibrary.AdvancedMarkerElement,
    PinElement: markerLibrary.PinElement,
  };
};

/**
 * Geocodes an address string to coordinates using Google Geocoding API
 */
export const geocodeAddress = async (
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> => {
  if (!address.trim()) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location;
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
};

