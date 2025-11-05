export type GeolocationErrorCode = 'denied' | 'timeout' | 'unavailable' | 'unsupported' | 'insecure_origin';

export class GeolocationError extends Error {
  readonly code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeolocationError);
    }
  }
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
}

export interface GeolocationPosition {
  lat: number;
  lon: number;
}

// Whitelist of trusted loopback hostnames for development
const TRUSTED_LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '::1'];

/**
 * Checks if the current context supports geolocation
 * @returns An object with information about geolocation support
 */
export function checkGeolocationSupport() {
  const isSupported = 'geolocation' in navigator;
  const isSecureContext = window.isSecureContext;
  const isTrustedLoopback = TRUSTED_LOOPBACK_HOSTNAMES.includes(window.location.hostname);
  const isSecureOrigin = isSecureContext || isTrustedLoopback;
  
  return {
    isSupported,
    isSecureContext,
    isLocalhost: isTrustedLoopback,
    isSecureOrigin,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
  };
}

export async function getCurrentPosition(options: GeolocationOptions = {}): Promise<GeolocationPosition> {
  const {
    enableHighAccuracy = true,
    timeoutMs = 8000,
    maximumAgeMs = 60000,
  } = options;

  // Check if geolocation is supported
  if (!('geolocation' in navigator)) {
    throw new GeolocationError('unsupported', 'Geolocation is not supported by your browser');
  }

  // Check if the context is secure (required for geolocation)
  const isTrustedLoopback = TRUSTED_LOOPBACK_HOSTNAMES.includes(window.location.hostname);
  if (!window.isSecureContext && !isTrustedLoopback) {
    throw new GeolocationError('insecure_origin', 'Geolocation requires a secure context (HTTPS) or trusted loopback hostname');
  }

  // Always attempt the geolocation request - the browser will:
  // 1. Prompt the user if permission hasn't been set yet (prompt state)
  // 2. Use cached permission if granted
  // 3. Immediately fail if permission was previously denied
  // We don't check permission state first because it can prevent the prompt from appearing
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        let errorCode: GeolocationErrorCode;
        let message: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorCode = 'denied';
            message = 'Location permission denied. You may have previously blocked this site from accessing your location. Please enable location access in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorCode = 'unavailable';
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorCode = 'timeout';
            message = 'The request to get user location timed out.';
            break;
          default:
            errorCode = 'unavailable';
            message = 'An unknown error occurred while retrieving location.';
            break;
        }

        reject(new GeolocationError(errorCode, message));
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      }
    );
  });
}
