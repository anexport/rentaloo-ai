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
  if (isLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
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
    script.defer = true;
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
  return isLoaded && !!window.google?.maps?.places;
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

