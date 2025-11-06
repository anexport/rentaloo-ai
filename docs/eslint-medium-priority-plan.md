# ESLint Medium-Priority Fix Plan

Scope: Remaining issues not covered by the high-priority plan, focused on preventing HMR/dev instability and strengthening type safety at boundaries while avoiding broad churn.

Target rules:
- react-refresh/only-export-components (HMR consistency)
- @typescript-eslint/no-explicit-any (boundary types only in this pass)
- @typescript-eslint/no-invalid-void-type (type correctness)

Success criteria:
- All `react-refresh/only-export-components` errors resolved by moving non-component exports to separate files.
- All `no-invalid-void-type` errors fixed with valid alternatives.
- Convert `any` at shared boundaries (contexts, hooks, services, API/lib types) to concrete types or `unknown` with safe narrowing. Internal/local `any` uses can be handled in a later pass.

## Findings (from latest ESLint run)

Key locations (abbreviated):

react-refresh/only-export-components
- /src/contexts/AuthContext.tsx:24
- /src/contexts/ThemeContext.tsx:57

@typescript-eslint/no-invalid-void-type
- /src/lib/database.types.ts:774, 781

@typescript-eslint/no-explicit-any (boundary-focused selection)
- /src/contexts/AuthContext.tsx:19, 76, 113, 120
- /src/hooks/useBookingRequests.ts:60, 87, 113
- /src/hooks/useMessaging.ts:581, 589, 616, 622, 679, 705, 731, 750, 853, 859, 889, 947, 953, 983, 1035, 1041, 1057, 1063, 1078, 1084, 1104, 1110, 1130, 1136, 1154, 1160, 1247, 1253
- /src/features/location/providers/nominatim.ts:200
- /src/features/location/useAddressAutocomplete.ts:66
- /src/components/messaging/MessagingInterface.tsx:60
- /src/components/explore/SearchBarPopover.tsx:246, 247
- /src/components/EquipmentListingForm.tsx:419
- /src/lib/booking.ts:128
- /src/pages/auth/OwnerRegistration.tsx:95
- /src/pages/auth/RenterRegistration.tsx:94, 242
- /src/pages/payment/PaymentConfirmation.tsx:17
- /src/pages/ProfileSettings.tsx:107
- /src/lib/database.types.ts:14

## Fix Strategies

### 1) react-refresh/only-export-components
- Split non-component exports (constants, helpers, types) into sibling files and re-export as needed.
- Keep context providers/components as the only exports in `*.tsx` files flagged by this rule.

Actionable steps:
- AuthContext
  - Move non-component exports (e.g., helpers/constants) to `src/contexts/auth-helpers.ts`.
  - Ensure `AuthProvider` and context objects are the only exports from `AuthContext.tsx`.
- ThemeContext
  - Move non-component exports to `src/contexts/theme-helpers.ts`.
  - Keep only `ThemeProvider` and context exports in `ThemeContext.tsx`.

### 2) @typescript-eslint/no-invalid-void-type
- Replace invalid `void` usages in non-return positions with `undefined` or correct type parameters.
- In generated DB types, ensure function fields use `() => void` for returns, and union types that used `void` as a value become `undefined`.

Actionable steps:
- `src/lib/database.types.ts`
  - At lines 774, 781 replace value-position `void` with `undefined` or refine the type alias/interface to use `void` only as a function return. Example: `type Fn = () => void;` or `T | undefined` instead of `T | void` for values.

### 3) @typescript-eslint/no-explicit-any (boundary pass)
- Replace `any` with precise types where data crosses module boundaries (contexts, hooks, services, API types). If unknown, use `unknown` and narrow at use-sites.
- Introduce minimal domain types where missing (e.g., `Message`, `BookingRequest`, `AddressSuggestion`, `SearchFilter`), colocated near the feature (`src/hooks/useMessaging.ts` et al.) or under `src/types/`.
- For Supabase-generated types in `database.types.ts`, prefer the generated shapes; avoid reintroducing `any` by aligning with these types.

Actionable steps by area:
- Auth
  - `src/contexts/AuthContext.tsx` — Define `AuthUser`, `AuthState`, and typed context value. Replace `any` for session/user and provider return values with explicit types from auth SDK or project types.
- Messaging
  - `src/hooks/useMessaging.ts` — Define `Message`, `Thread`, `TypingEvent`, `DeliveryReceipt`, and function param/return types. Avoid `any` in event handlers; use discriminated unions if events vary.
  - `src/components/messaging/MessagingInterface.tsx:60` — Type the handler or payload shape used.
- Booking
  - `src/hooks/useBookingRequests.ts` — Introduce `BookingRequest` shape and type API responses. Replace `any` in fetch/transform logic with these types.
  - `src/lib/booking.ts:128` — Use `Booking`/`BookingLine` domain types.
- Location/Explore
  - `src/features/location/providers/nominatim.ts:200` — Type provider response as `NominatimResult` and narrow fields.
  - `src/features/location/useAddressAutocomplete.ts:66` — Type suggestions as `AddressSuggestion[]`.
  - `src/components/explore/SearchBarPopover.tsx:246,247` — Type callback/params (`SearchFilter`, `SortOption`).
- Forms/Pages
  - `src/components/EquipmentListingForm.tsx:419` — Type event/field values (`ChangeEvent<HTMLInputElement>` or form schema types).
  - `src/pages/auth/*Registration.tsx` — Type form data model; remove `any` from handlers.
  - `src/pages/payment/PaymentConfirmation.tsx:17` — Type route/loader params or payment response payload.
  - `src/pages/ProfileSettings.tsx:107` — Type settings model.
- Lib types
  - `src/lib/database.types.ts:14` — Replace `any` with appropriate table/row shapes from generated types or `unknown` with narrowing.

## Implementation Order (Checklist)

1) Fix HMR rule
   - [ ] Split non-component exports in `AuthContext.tsx`
   - [ ] Split non-component exports in `ThemeContext.tsx`

2) Fix invalid void usages
   - [ ] Correct `void` misuse in `src/lib/database.types.ts:774, 781`

3) Boundary typing pass (targeted files)
   - [ ] `src/contexts/AuthContext.tsx` — introduce `AuthUser`/`AuthState` and type context
   - [ ] `src/hooks/useMessaging.ts` — add domain types and replace `any`
   - [ ] `src/components/messaging/MessagingInterface.tsx:60` — type handler payload
   - [ ] `src/hooks/useBookingRequests.ts` — type API and data model
   - [ ] `src/lib/booking.ts:128` — use booking types
   - [ ] `src/features/location/providers/nominatim.ts:200` — type provider result
   - [ ] `src/features/location/useAddressAutocomplete.ts:66` — type suggestions
   - [ ] `src/components/explore/SearchBarPopover.tsx:246,247` — type callbacks/params
   - [ ] `src/components/EquipmentListingForm.tsx:419` — type form field/event
   - [ ] `src/pages/auth/OwnerRegistration.tsx:95` — type form model
   - [ ] `src/pages/auth/RenterRegistration.tsx:94,242` — type form model
   - [ ] `src/pages/payment/PaymentConfirmation.tsx:17` — type route/payment payload
   - [ ] `src/pages/ProfileSettings.tsx:107` — type settings model
   - [ ] `src/lib/database.types.ts:14` — eliminate boundary `any`

## Verification
- Re-run ESLint and confirm these rule sets are error-free:
  - `npx eslint . | rg -N "react-refresh/only-export-components|@typescript-eslint/no-explicit-any|@typescript-eslint/no-invalid-void-type"`
- Build and run dev server to confirm HMR works as expected for contexts.

## Notes
- Keep this pass scoped to boundaries to minimize churn; deeper `any` cleanup can follow once models stabilize.
- When unsure of a precise type, use `unknown` at the boundary and validate/narrow at the use site.

