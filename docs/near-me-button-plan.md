# “Near Me” Button — Implementation Plan

Goal: Add a “Near me” control around the home page search bar that pre-fills the location field using the user’s current location. The action must NOT auto-run a search. It should provide a clear loading state, graceful error handling, and accessible feedback.

## Scope

- Home page search: `src/pages/ExplorePage.tsx` uses `SearchBarPopover` for the hero search.
- Primary integration point: `src/components/explore/SearchBarPopover.tsx` (desktop and mobile search UI).
- No changes to server-side search; we only prefill `SearchBarFilters.location` and let the existing “Search” button submit as usual.

## UX Placement

- Desktop (SearchBarPopover)
  - Primary: add a “Use current location” action within the Location popover (top of the “Popular destinations” list). This reduces clutter in the main bar and keeps the action contextually tied to “Where”.
  - Optional: add a small icon-only button in the “Where” segment of the search bar (right-aligned inside that segment) as a shortcut. This is secondary and can be added later behind a feature flag to avoid crowding.

- Mobile (Search sheet in SearchBarPopover)
  - Add a prominent “Use current location” row/action at the top of the Where section, above the search input and chips.

## Behavior (single tap flow)

1. User taps “Use current location”.
2. Show inline loading state on the tapped control (spinner) and temporarily disable repeated taps; `aria-busy=true` on the control region.
3. Request geolocation via `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }`.
4. On success, perform reverse geocoding to a human-readable place (city + region). If reverse geocoding fails, fall back to a coarse label like “Near you” or a rounded lat/lng (e.g., “37.77, -122.42”).
5. Prefill the location field (i.e., update `SearchBarFilters.location`) with the resolved place string. Do not trigger a search; let the user still press the Search button.
6. Provide subtle feedback: a short toast “Using your current location” and/or a brief highlight of the Where field. Clear the loading state.
7. On permission denied/timeout/error: clear loading; show an inline error plus a toast with guidance and a “Try again” option.

## Copy (proposed)

- Button label: “Use current location” (desktop/mobile); icon: crosshair/target.
- Loading: “Detecting your location…”
- Success toast: “Using your current location.”
- Permission denied: “Location permission denied. Enter a city or enable location in your browser settings.”
- Timeout: “Couldn’t get your location. Check signal and try again.”
- Reverse-geocode failed: “Found your location, but couldn’t resolve a place name.”

## Accessibility

- Button must have `aria-label="Use current location"` and visible text on mobile. For icon-only variant on desktop, ensure the aria-label is present.
- Use `aria-busy=true` on the control region during lookup.
- Announce status via an `aria-live="polite"` region (e.g., loading/success/error text near the control).
- Maintain focus origin: after success, keep focus on the control or move it to the location chip consistently; avoid unexpected jumps.

## Privacy & Security

- Do not persist raw coordinates. Use them only to derive a place string; only the place string is stored in UI state.
- No background location tracking. Single request per tap; respect user intent.
- HTTPS is required for geolocation in production (localhost is allowed for dev). Show a helpful message if not on secure origin.

## Integration Details

- State shape: `SearchBarFilters` already includes `location: string` (see `src/types/search.ts`). We only set this value.
- Reverse geocoding provider: Nominatim (OpenStreetMap) — chosen for MVP.
  - Endpoint: `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2&zoom=10&addressdetails=1&accept-language={lang}&email={email}`
    - `zoom=10` aims for city/region granularity.
    - `accept-language` can use `navigator.language` with a safe default of `en`.
    - `email` is optional but recommended by Nominatim for contact (set via env).
  - Compliance: follow usage policy (low volume, 1 req/sec, cache results).
    - Browsers cannot set `User-Agent`; rely on `Referer` header + `email` query param for identification.
    - Do not spam; only call on explicit user tap.
  - Formatting: prefer `city || town || village || hamlet`, then `state || region`, then `country_code` uppercased.
    - Examples: “Seattle, WA”, “Bavaria, DE”, fallback to rounded coordinates if no address fields present.
  - Future: consider swapping to a backend proxy later for resiliency and caching if traffic grows.

## Implementation Tasks

1) Utilities
- Add `src/features/location/useGeolocation.ts` (hook)
  - Expose `getCurrentPosition(): Promise<{ lat: number; lon: number }>` with options and robust error mapping (denied, timeout, unavailable).

- Add `src/features/location/geocoding.ts`
  - `reverseGeocode(lat, lon, signal?): Promise<string | null>` calls Nominatim, supports `AbortController`, and returns a best-effort place string.
  - Keep provider-specific code isolated: `src/features/location/providers/nominatim.ts`.

2) SearchBar UI integration
- Desktop: `src/components/explore/SearchBarPopover.tsx`
  - In the Location popover content (file start around: `src/components/explore/SearchBarPopover.tsx:526`), insert a top section with the “Use current location” button.
  - Wire loading state (`isLocating`) and errors (`locationError`).
  - On success: set `onChange({ ...value, location: placeString })`; close only the popover if that feels natural; keep the main bar intact. Do not call `onSubmit`.

- Mobile: same file, Where section in the sheet (see section starting near: `src/components/explore/SearchBarPopover.tsx:299`).
  - Add a row-style button at the top: “Use current location”.
  - Reuse the same `isLocating` and error handling.

- Feedback: use existing toast system (`@/hooks/useToast`) to show success/error toasts.

3) Env & configuration
- Add optional contact email to `.env.local` (helps with Nominatim identification and support): `VITE_NOMINATIM_EMAIL=you@example.com`.
- Add a feature flag (optional): `VITE_FEATURE_NEAR_ME=true` to gate the optional desktop inline shortcut.
- Optional base override for self-hosted or proxy usage later: `VITE_NOMINATIM_BASE=https://nominatim.openstreetmap.org`.

4) Error handling & edge cases
- Permission denied: inline helper text + toast. Offer “Enter location manually” (focus the input).
- Timeout: show retry affordance.
- Reverse geocode failure: still prefill a generic “Near you” or rounded coordinates.
- Non-secure origin: show a toast explaining the need for HTTPS (skippable on localhost).

5) Testing (Vitest)
- Unit: `useGeolocation`
  - Mock `navigator.geolocation` for success, denied, timeout, and error.
  - Verify error mapping and options.
- Integration: `SearchBarPopover`
  - Simulate clicking “Use current location” → location field prefilled, no search triggered.
  - Loading spinner visible during lookup; disabled state enforced.
  - Error states show correct copy; retry works.

6) Analytics (optional)
- Events: `near_me_click`, `near_me_success`, `near_me_denied`, `near_me_timeout`, `near_me_geocode_fail`.
- Properties: device type (mobile/desktop), time-to-fix (ms), provider used.

## Acceptance Criteria

- Placement
  - Desktop: “Use current location” appears in the Location popover above the list of popular destinations.
  - Mobile: the same action appears at the top of the Where section.

- Behavior
  - Clicking the action requests location, shows a loading indicator, and then pre-fills the location field with a readable place.
  - It never auto-submits a search; users still press the Search button.
  - Permission denied/timeout/errors show reasonable inline feedback and a toast.
  - Success gives subtle confirmation (toast and/or highlight).

- Accessibility
  - Action is keyboard reachable and screen-reader friendly; status updates are announced.

- Resilience
  - Reverse geocoding failure still results in a reasonable placeholder (“Near you”).

## Rough Timeline

- Day 1: Utilities (`useGeolocation`, `reverseGeocode`) + env wiring.
- Day 2: Desktop and mobile UI integration in `SearchBarPopover` + basic toasts.
- Day 3: Tests (unit + integration), polish copy, QA across browsers (Chrome, Safari iOS, Firefox).

## Out of Scope (for now)

- Auto-running the search after prefill (explicitly excluded).
- Server-side IP-based fallback or persistent user location storage.
- Map view or distance-based filtering beyond the current text-based location input.

## File Touch List (anticipated)

- `src/features/location/useGeolocation.ts` — new hook for geolocation.
- `src/features/location/geocoding.ts` — reverse geocoding with provider selection.
- `src/features/location/providers/mapbox.ts` — Mapbox-specific implementation (optional alt: Nominatim).
- `src/components/explore/SearchBarPopover.tsx` — add UI controls, loading states, and wiring.
- `src/types/search.ts` — no shape change expected; read-only usage.
- `src/test/features/location/useGeolocation.test.ts` — unit tests.
- `src/test/components/SearchBarPopover.nearMe.test.tsx` — integration tests.

## Developer Notes

- Keep the UI subtle to avoid crowding the search bar. Prioritize the popover action; the inline desktop shortcut can be feature-flagged.
- Use `AbortController` to cancel reverse geocoding if the popover closes or the user navigates away.
- Debounce reverse-geocode only if you consider adding “follow me” style updates in the future; for single-tap, immediate call is fine.
- Consider caching the last resolved place for the session to avoid repeat geocoding if a user taps “Near me” multiple times.
