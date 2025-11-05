# Near Me — Executor Spec (Nominatim, no auto-search)

This spec is prescriptive for an AI/code executor to implement the “Near me” button that pre-fills the location field in the home search bar. It uses the browser Geolocation API and OpenStreetMap Nominatim for reverse geocoding. No automatic search submission.

Non-goals: no map, no distance filter changes, no server changes. Geolocation used only on explicit tap.

## Decisions & Constraints

- Placement
  - Desktop: add an action inside the Location popover in `SearchBarPopover` above popular destinations.
  - Mobile: add an action at the top of the Where section in the search sheet.
- Behavior
  - On tap: request location → reverse geocode → set `SearchBarFilters.location`.
  - Do not call `onSubmit()`. Let user press Search.
  - Provide loading state, toast feedback, and error handling.
- Provider: Nominatim
  - **Identification**: Include either an `email` parameter (e.g., `email=rentaloo@gmail.com`) OR an explicit, descriptive `User-Agent` header identifying the application and contact (e.g., `User-Agent: RentAloo/1.0 (contact: rentaloo@gmail.com)`). Example: `?email=rentaloo@gmail.com` or `User-Agent: RentAloo/1.0 (contact: rentaloo@gmail.com)`.
  - **Throttling**: Mandatory rate limiting of **one request per second per IP address** (max 1 request/second). Implement exponential backoff on 429 (Too Many Requests) responses with retry delays (e.g., 1s, 2s, 4s, 8s).
  - **Usage Policy**: Callers must respect [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) including identification requirements and rate limits. Ensure this function is only called on explicit tap; no automatic polling or retry loops.
- Security/privacy: do not persist coordinates; use HTTPS (localhost in dev is OK), no background polling.

## Files to Add

1) `src/features/location/useGeolocation.ts`
- Exports:
  - `type GeolocationErrorCode = 'denied' | 'timeout' | 'unavailable' | 'unsupported' | 'insecure_origin'`
  - `async function getCurrentPosition(options?: { enableHighAccuracy?: boolean; timeoutMs?: number; maximumAgeMs?: number; }): Promise<{ lat: number; lon: number }>`
- Behavior:
  - If `!('geolocation' in navigator)`: throw `{ code: 'unsupported' }`.
  - If `!window.isSecureContext` and origin is not localhost: throw `{ code: 'insecure_origin' }`.
  - Wrap `navigator.geolocation.getCurrentPosition` in a Promise.
  - Map errors:
    - `PERMISSION_DENIED` → `denied`
    - `POSITION_UNAVAILABLE` → `unavailable`
    - `TIMEOUT` → `timeout`
  - Defaults: `{ enableHighAccuracy: true, timeoutMs: 8000, maximumAgeMs: 60000 }`.

2) `src/features/location/providers/nominatim.ts`
- Exports:
  - `async function reverseGeocodeNominatim(lat: number, lon: number, opts?: { signal?: AbortSignal; language?: string; baseUrl?: string; }): Promise<{ label: string } | null>`
- Implementation details:
  - Default `baseUrl`: `https://nominatim.openstreetmap.org` (via `import.meta.env.VITE_NOMINATIM_BASE || ...`).
  - Build URL: `/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=10&addressdetails=1&accept-language={lang}&email=rentaloo@gmail.com`.
  - **Identification**: Include `email=rentaloo@gmail.com` parameter in the URL. Alternatively, set a descriptive `User-Agent` header: `User-Agent: RentAloo/1.0 (contact: rentaloo@gmail.com)`.
  - **Throttling**: Implement mandatory rate limiting of **one request per second per IP address** (max 1 request/second). On 429 responses, implement exponential backoff with retry delays (e.g., 1s, 2s, 4s, 8s). Respect Nominatim usage policy; ensure this function is only called on explicit tap; no automatic polling or retry loops.
  - Fetch with `signal` if provided. Example headers:
    ```typescript
    headers: {
      'User-Agent': 'RentAloo/1.0 (contact: rentaloo@gmail.com)',
      // ... other headers
    }
    ```
    Or include in URL: `?email=rentaloo@gmail.com&format=jsonv2&...`
  - Parse `address`: choose first defined from `city | town | village | hamlet` as `locality`.
    - Region from `state | region`; country code from `country_code?.toUpperCase()`.
    - Return compact label: `"${locality}, ${regionCodeOrStateAbbrev}"` or `"${region}, ${countryCode}"` if no locality. If nothing useful, return rounded coords: `"${lat.toFixed(2)}, ${lon.toFixed(2)}"`.
  - Return `null` only on hard fetch errors; otherwise return `{ label }`.

3) `src/features/location/geocoding.ts`
- Exports:
  - `async function reverseGeocode(lat: number, lon: number, opts?: { signal?: AbortSignal; language?: string; }): Promise<string | null>`
- Implementation details:
  - Simple in-memory cache `Map<string, { label: string; ts: number }>` keyed by `lat.toFixed(3)+','+lon.toFixed(3)`; TTL 5 minutes.
  - Call `reverseGeocodeNominatim` and return `label` or null.

## File to Modify

`src/components/explore/SearchBarPopover.tsx`

1) Imports
- Add: `import { useToast } from "@/hooks/useToast";`
- Add: `import { reverseGeocode } from "@/features/location/geocoding";`
- Add: `import { getCurrentPosition } from "@/features/location/useGeolocation";`
- Add icon: consider `import { Crosshair } from 'lucide-react'` (or reuse `MapPin`).

2) Local state
- Add: `const [isLocating, setIsLocating] = useState(false);`

3) Handler
- Add function `handleUseCurrentLocation = async () => { ... }`:
  - Guard: if `isLocating` → return.
  - `setIsLocating(true)`.
  - Try:
    - `const { lat, lon } = await getCurrentPosition();`
    - `const controller = new AbortController(); const label = await reverseGeocode(lat, lon, { signal: controller.signal, language: navigator.language || 'en' });`
    - `const place = label ?? 'Near you';`
    - Use existing location flow: `handleLocationSelect(place)` (so it advances the section same as manual select).
    - `toast({ title: 'Location set', description: 'Using your current location.' });`
  - Catch mapped errors and toast:
    - `denied`: "Location permission denied. Enter a city or enable location in your browser settings."
    - `timeout`: "Couldn’t get your location. Check signal and try again."
    - `unsupported`/`insecure_origin`/`unavailable`: "Location isn’t available right now. Try entering a city."
  - Finally: `setIsLocating(false)`.

4) Mobile UI insertion (Where section)
- Anchor: lines 300–360. Insert a button block right after the description (after line 309) and before the `<Command ...>` block (line 310).
- Markup guidance:
  - A full-width `Button` (variant `secondary`) with `Crosshair`/`MapPin` icon, text "Use current location".
  - `onClick={handleUseCurrentLocation}`.
  - Disabled + spinner while `isLocating`; add `aria-busy={isLocating}`.
  - Place a small helper text under it to show inline errors if desired; toasts already cover main feedback.

5) Desktop UI insertion (Location popover content)
- Anchor: lines 526–545 (inside `<PopoverContent className="w-80 p-0" align="start">`). Insert a small section before the `<Command>`:
  - A subtle `Button` or clickable row with icon and text "Use current location".
  - Same `onClick` and loading/disabled/aria-busy behavior.
  - Separate with a divider from the "Popular destinations" list, or use a list header "Near me".

6) Accessibility
- Ensure the button has `aria-label="Use current location"`.
- While locating, set `aria-busy=true` on the container and include visually-hidden status text in a `aria-live="polite"` span like "Detecting your location…".

7) No auto-submit
- Do not call `onSubmit()` anywhere in the handler.

## Copy

- Button: "Use current location"
- Loading hint: "Detecting your location…"
- Success toast: title "Location set", description "Using your current location."
- Errors: as mapped in handler above.

## Tests (Vitest + React Testing Library)

1) `src/test/features/location/useGeolocation.test.ts`
- Mocks `navigator.geolocation` with success (lat/lon), denied, timeout, unavailable; asserts mapping to codes.
- Verifies `timeoutMs`, `maximumAgeMs`, and `enableHighAccuracy` are passed.

2) `src/test/features/location/reverseGeocode.nominatim.test.ts`
- Mocks `global.fetch` returning sample Nominatim JSON payloads:
  - With `city` + `state` → returns `"City, State"`.
  - With only `state` + `country_code` → returns `"State, CC"`.
  - With no usable address → rounds coordinates.
- Tests cache behavior: second call within TTL avoids new fetch.

3) `src/test/components/SearchBarPopover.nearMe.test.tsx`
- Renders `SearchBarPopover` with default props.
- Mobile flow:
  - Set `isDesktop` false via mocking `useMediaQuery` (or render small viewport variant if feasible).
  - Click "Use current location" → mock geolocation success + reverse geocode → ensure `onChange` receives updated `location` and `onSubmit` is NOT called.
  - Button shows disabled/spinner state during async.
- Desktop flow:
  - Open Location popover, click the action → same assertions.
- Error flows: denied/timeout/unavailable → show toasts (assert toast container received messages) and no `onChange`.

## QA Checklist

- Works on HTTPS and localhost; shows helpful message on insecure origin.
- Keyboard:
  - Focusable control in both mobile sheet and desktop popover; Enter/Space activates.
  - No unexpected focus jumps after success.
- Screen reader:
  - Announces button label; loading announced via polite live region.
- Visual:
  - Loading spinner visible; button disabled while loading.
  - Location value updated in search summary after success; no auto-search.
- Rate limits:
  - One reverse geocode call per explicit tap; no retries loop.
- Cross-browser:
  - Chrome/Edge/Firefox desktop; Safari iOS: verify geolocation prompt and success path.

## Implementation Notes

- Keep changes scoped; do not refactor unrelated parts.
- Use existing `Button`, `Badge`, and toast utilities for consistent styling.
- Add minimal CSS only via existing utility classes; do not introduce new CSS files.
- Prefer calling `handleLocationSelect(place)` to reuse the existing flow (it advances the section on mobile and desktop as today).
- Maintain TypeScript strictness and existing lint rules.

## Acceptance Criteria

- “Use current location” appears where specified on both mobile and desktop.
- Clicking it pre-fills the location field with a readable label (Nominatim-based) or a reasonable fallback.
- No automatic search execution.
- Clear loading state and accessible feedback; errors are handled gracefully.
- Unit and integration tests pass locally.
