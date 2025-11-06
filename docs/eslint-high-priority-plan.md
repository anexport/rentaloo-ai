# ESLint High-Priority Fix Plan

This plan targets the issues most likely to cause real bugs or stale behavior:

- react-hooks/exhaustive-deps
- @typescript-eslint/no-non-null-assertion
- @typescript-eslint/no-non-null-asserted-optional-chain

Success criteria:
- All occurrences of the above rules are resolved or explicitly justified with comments and tests.
- Re-running ESLint shows 0 errors for these rules and no remaining warnings for hooks deps.

## Current High-Priority Findings (from eslint-high.txt)

Exact locations captured via `npx eslint .` and filtered to the three rules:

```
/src/components/AvailabilityCalendar.tsx:39:6 react-hooks/exhaustive-deps warn - React Hook useEffect has a missing dependency: 'fetchAvailability'. Either include it or remove the dependency array.
/src/components/equipment/ListingCard.tsx:41:24 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/components/equipment/ListingCard.tsx:61:22 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/components/equipment/ListingCard.tsx:70:18 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/components/EquipmentListingForm.tsx:251:9 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/components/EquipmentManagement.tsx:52:6 react-hooks/exhaustive-deps warn - React Hook useEffect has a missing dependency: 'fetchEquipment'. Either include it or remove the dependency array.
/src/components/messaging/MessagingInterface.tsx:190:24 react-hooks/exhaustive-deps warn - The ref value 'typingTimeoutRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'typingTimeoutRef.current' to a variable inside the effect, and use that variable in the cleanup function.
/src/components/messaging/MessagingInterface.tsx:243:24 react-hooks/exhaustive-deps warn - The ref value 'typingTimeoutRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'typingTimeoutRef.current' to a variable inside the effect, and use that variable in the cleanup function.
/src/components/messaging/MessagingInterface.tsx:271:6 react-hooks/exhaustive-deps warn - React Hook useMemo has an unnecessary dependency: 'user.id'. Either exclude it or remove the dependency array.
/src/contexts/AuthContext.tsx:118:19 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/contexts/AuthContext.tsx:118:19 @typescript-eslint/no-non-null-asserted-optional-chain error - Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong.
/src/hooks/useBookingRequests.ts:198:6 react-hooks/exhaustive-deps warn - React Hook useEffect has a missing dependency: 'fetchBookingRequests'. Either include it or remove the dependency array.
/src/hooks/useMediaQuery.ts:20:6 react-hooks/exhaustive-deps warn - React Hook useEffect has a missing dependency: 'matches'. Either include it or remove the dependency array.
/src/hooks/useMessaging.ts:383:9 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/main.tsx:18:12 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/pages/equipment/EquipmentDetailPage.tsx:13:37 @typescript-eslint/no-non-null-assertion error - Forbidden non-null assertion.
/src/pages/owner/OwnerDashboard.tsx:52:6 react-hooks/exhaustive-deps warn - React Hook useEffect has a missing dependency: 'fetchStats'. Either include it or remove the dependency array.
```

## Fix Strategies

### 1) React hook dependency warnings (exhaustive-deps)
- Include referenced values in the dependency array. For functions, wrap with `useCallback` to keep stable identities.
- For refs used inside cleanup: copy `ref.current` into a local variable at the top of the effect, use the local in cleanup, and keep the dependency array stable.
- For `useMemo` unnecessary deps: drop the extra dependency unless it affects computed output.
- If the effect is intended to run once, make the effect safe by hoisting stable functions outside the component or memoizing dependencies with `useMemo`/`useCallback`.

Example patterns:
- Functions: `const fetchX = useCallback(() => { ... }, [a,b])` then `useEffect(() => { fetchX() }, [fetchX])`.
- Refs in cleanup: `const timeout = typingRef.current; return () => timeout && clearTimeout(timeout);`.

### 2) Non-null assertions (including on optional chains)
- Replace `value!.prop` with safe guards and narrowing:
  - Early return: `if (!value) return; value.prop...`
  - Throw/invariant if truly required: `if (!value) throw new Error("...")`
  - Defaulting: `const x = value?.prop ?? defaultValue`
  - Type predicate helper: `assertExists(value): asserts value is T` when appropriate.
- For DOM mounting (e.g., `document.getElementById('root')!`): explicitly guard and throw once, then proceed.

Example patterns:
- DOM: `const root = document.getElementById('root'); if (!root) throw new Error('Root element not found'); createRoot(root).render(...);`
- Optional chain + non-null: replace `obj?.x!.y` with `const x = obj?.x; if (!x) return; x.y...` (or default / throw).

## Implementation Order (Checklist)

1) Eliminate non-null assertions that can crash at startup
   - [ ] `src/main.tsx:18:12` — guard `getElementById` and throw if missing

2) Fix non-null assertions in core flows
   - [ ] `src/components/equipment/ListingCard.tsx:41,61,70` — guard props/derived data before access
   - [ ] `src/components/EquipmentListingForm.tsx:251` — guard state/ref before access
   - [ ] `src/contexts/AuthContext.tsx:118` — remove `!` on optional chain; narrow or default
   - [ ] `src/hooks/useMessaging.ts:383` — guard ref/state
   - [ ] `src/pages/equipment/EquipmentDetailPage.tsx:13:37` — remove `!`, narrow param/route data

3) Fix hook dependency warnings to avoid stale closures
   - [ ] `src/components/AvailabilityCalendar.tsx:39` — wrap `fetchAvailability` with `useCallback` or inline deps
   - [ ] `src/components/EquipmentManagement.tsx:52` — stabilize `fetchEquipment` and include in deps
   - [ ] `src/hooks/useBookingRequests.ts:198` — stabilize `fetchBookingRequests`
   - [ ] `src/hooks/useMediaQuery.ts:20` — ensure `matches` is included or memoized
   - [ ] `src/pages/owner/OwnerDashboard.tsx:52` — stabilize `fetchStats`
   - [ ] `src/components/messaging/MessagingInterface.tsx:190,243` — copy `typingTimeoutRef.current` to a local and use in cleanup
   - [ ] `src/components/messaging/MessagingInterface.tsx:271` — drop unnecessary `user.id` from `useMemo` deps if output doesn’t depend on it

## Working Notes / Guidance

- Keep dependency arrays accurate; prefer `useCallback` over disabling the rule. Avoid inline function creation inside `useEffect` if it captures changing values.
- Prefer early returns to reduce nested conditionals when replacing non-null assertions.
- If a value is guaranteed by construction, add a local invariant check with an explanatory error; this documents intent and satisfies the type checker.

## Verification

1) Run ESLint focusing on the three rules to confirm zero results:
   - `npx eslint . | rg -N 'react-hooks/exhaustive-deps|@typescript-eslint/no-non-null-assertion|@typescript-eslint/no-non-null-asserted-optional-chain'`
2) Full run for regressions:
   - `npx eslint .`
3) Sanity test flows touched (listing view, auth, messaging, equipment details, owner dashboard) for runtime correctness.

## Out-of-Scope (follow-up)

- Broader `any` removals and fast-refresh rule cleanup can follow once high-priority items are resolved.

