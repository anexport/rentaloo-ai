# Sticky Sidebar Refactoring Guide

## Overview
This guide provides a comprehensive plan for refactoring the sticky booking sidebar in `EquipmentDetailDialog.tsx` to improve its hierarchy, maintainability, and user experience.

## Current Structure Analysis

### Current Location
- **File**: `src/components/equipment/EquipmentDetailDialog.tsx`
- **Lines**: ~665-875
- **Current Structure**: Monolithic sidebar within the main dialog component

### Current Hierarchy Issues

1. **Mixed Concerns**: The sidebar combines:
   - Pricing display
   - Location information
   - Contact information
   - Date selection
   - Pricing breakdown
   - Booking action button

2. **Poor Reusability**: All logic is tightly coupled to the parent component

3. **Accessibility Concerns**: Complex nested structures with multiple interactive elements

4. **Maintainability**: 200+ lines of sidebar code in a 900+ line component

---

## Recommended Refactoring Strategy

### Phase 1: Component Extraction

Extract the sidebar into separate, focused components following the Single Responsibility Principle.

#### 1.1 Create `BookingSidebar` Component

**File**: `src/components/booking/BookingSidebar.tsx`

**Purpose**: Container component that orchestrates all sidebar sections

**Props**:
```typescript
interface BookingSidebarProps {
  listing: Listing;
  avgRating: number;
  reviewCount: number;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  calculation: BookingCalculation | null;
  onBooking: () => void;
  isCreatingBooking: boolean;
  user: User | null;
}
```

**Structure**:
```tsx
<aside className="lg:sticky lg:top-6 h-fit">
  <Card className="p-6 space-y-6">
    <PricingHeader {...headerProps} />
    <Separator />
    <LocationContact {...locationProps} />
    <Separator />
    <DateSelector {...dateProps} />
    <Separator />
    <PricingBreakdown {...pricingProps} />
    <BookingButton {...bookingProps} />
  </Card>
</aside>
```

#### 1.2 Create `PricingHeader` Component

**File**: `src/components/booking/sidebar/PricingHeader.tsx`

**Purpose**: Display daily rate and rating summary

**Props**:
```typescript
interface PricingHeaderProps {
  dailyRate: number;
  avgRating: number;
  reviewCount: number;
}
```

**Hierarchy**:
```
PricingHeader
├── Rate Display
│   ├── Price (text-3xl font-bold)
│   └── Unit Label (text-base text-muted-foreground)
└── Rating Display (conditional)
    ├── StarRating component
    └── Rating Text (text-sm text-muted-foreground)
```

**Semantic HTML**:
- Use `<div role="region" aria-labelledby="pricing-header">` for container
- Add `id="pricing-header"` to the rate display
- Ensure screen readers announce prices correctly with `aria-label`

#### 1.3 Create `LocationContact` Component

**File**: `src/components/booking/sidebar/LocationContact.tsx`

**Purpose**: Display pickup location and contact information

**Props**:
```typescript
interface LocationContactProps {
  location: string;
  contactMessage?: string;
}
```

**Hierarchy**:
```
LocationContact
├── Location Section
│   ├── Heading (font-semibold)
│   └── Location Display
│       ├── MapPin Icon
│       └── Address Text
└── Contact Section
    ├── Heading (font-semibold)
    └── Contact Text (text-muted-foreground)
```

**Improvements**:
- Add `aria-label` to location section for screen readers
- Consider making location clickable to focus map tab
- Use semantic headings (`<h4>`) instead of `<h3>` (sidebar is nested)

#### 1.4 Create `DateSelector` Component

**File**: `src/components/booking/sidebar/DateSelector.tsx`

**Purpose**: Handle date range selection with validation

**Props**:
```typescript
interface DateSelectorProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  minDate?: Date;
}
```

**Hierarchy**:
```
DateSelector
├── Section Heading
│   ├── Calendar Icon
│   └── Title
├── Date Inputs Container (flex gap-3)
│   ├── StartDatePicker
│   │   ├── Popover Trigger (Button)
│   │   └── Popover Content (Calendar)
│   └── EndDatePicker
│       ├── Popover Trigger (Button)
│       └── Popover Content (Calendar)
└── Conflicts Alert (conditional)
    └── Conflict Messages List
```

**Improvements**:
- Extract date picker logic into custom hook: `useDateRangePicker`
- Add keyboard navigation hints
- Improve focus management between calendars
- Add `aria-describedby` linking inputs to conflict messages
- Consider using `<fieldset>` with `<legend>` for better semantics

#### 1.5 Create `PricingBreakdown` Component

**File**: `src/components/booking/sidebar/PricingBreakdown.tsx`

**Purpose**: Display itemized pricing calculation

**Props**:
```typescript
interface PricingBreakdownProps {
  calculation: BookingCalculation | null;
  startDate?: string;
  endDate?: string;
}
```

**Hierarchy**:
```
PricingBreakdown
├── Section Heading
│   ├── DollarSign Icon
│   └── Title
└── Content
    ├── Calculation View (when available)
    │   ├── Duration Row
    │   ├── Daily Rate Row
    │   ├── Subtotal Row
    │   ├── Service Fee Row
    │   ├── Separator
    │   └── Total Row (emphasized)
    └── Empty State (when no dates selected)
```

**Improvements**:
- Use `<dl>` (description list) for semantic price breakdown:
  ```tsx
  <dl className="space-y-2 text-sm">
    <div className="flex justify-between">
      <dt className="text-muted-foreground">Duration:</dt>
      <dd className="font-medium">{duration}</dd>
    </div>
    {/* ... */}
  </dl>
  ```
- Add `aria-live="polite"` to announce price changes to screen readers
- Consider adding tooltips for fee explanations

#### 1.6 Create `BookingButton` Component

**File**: `src/components/booking/sidebar/BookingButton.tsx`

**Purpose**: Handle booking action with appropriate states

**Props**:
```typescript
interface BookingButtonProps {
  user: User | null;
  isOwner: boolean;
  hasValidDates: boolean;
  hasConflicts: boolean;
  isLoading: boolean;
  hasCalculation: boolean;
  onBook: () => void;
}
```

**Hierarchy**:
```
BookingButton
└── Button (size="lg", full width)
    └── Dynamic Text based on state
```

**Improvements**:
- Extract button text logic into helper function
- Add proper `aria-busy` attribute when loading
- Consider adding loading spinner icon
- Add haptic feedback considerations for mobile

---

### Phase 2: Styling & Layout Improvements

#### 2.1 Visual Hierarchy

**Current Issues**:
- All sections have equal visual weight
- No clear primary/secondary information distinction
- Inconsistent spacing

**Improvements**:

1. **Establish Visual Priority**:
   ```
   Primary   → Price & Booking Button (largest, most prominent)
   Secondary → Date Selection (interactive, medium emphasis)
   Tertiary  → Breakdown, Location, Contact (smaller, informational)
   ```

2. **Typography Scale**:
   ```typescript
   // Price: text-3xl (current) - Good ✓
   // Section Headings: text-sm font-semibold (upgrade from base)
   // Body Text: text-sm
   // Metadata: text-xs text-muted-foreground
   // Button: text-base font-semibold
   ```

3. **Spacing Consistency**:
   ```typescript
   // Use consistent spacing scale
   const spacing = {
     sectionGap: 'space-y-6',      // Between major sections
     itemGap: 'space-y-3',          // Within sections
     inlineGap: 'gap-2',            // Inline elements
     compactGap: 'gap-1.5',         // Tight groupings
   }
   ```

#### 2.2 Responsive Considerations

**Current State**: `lg:sticky lg:top-6 h-fit`

**Improvements**:

1. **Mobile Optimization**:
   - On mobile, sidebar should appear at bottom (after tabs)
   - Consider sticky bottom bar for mobile booking CTA
   - Reduce padding on small screens

2. **Tablet Behavior**:
   - On tablets (md breakpoint), decide: stack or side-by-side?
   - Recommend: Stack on md, side-by-side on lg+

3. **Desktop Enhancements**:
   - Max height consideration for very long content
   - Add `overflow-y-auto` if sidebar can scroll
   - Consider `max-h-[calc(100vh-4rem)]` for viewport-aware sizing

**Recommended Classes**:
```tsx
<aside className="
  order-first lg:order-last
  lg:sticky lg:top-6 
  lg:max-h-[calc(100vh-4rem)]
  h-fit
">
```

#### 2.3 Interactive States

**Add hover/focus states** for better UX:

```css
/* Date picker buttons */
.date-picker-button {
  @apply transition-colors duration-200;
  @apply hover:border-primary/50;
  @apply focus-visible:ring-2 focus-visible:ring-primary;
}

/* Booking button */
.booking-button {
  @apply transition-all duration-200;
  @apply hover:shadow-lg hover:scale-[1.02];
  @apply active:scale-[0.98];
}
```

---

### Phase 3: Accessibility Enhancements

#### 3.1 Semantic Structure

**Current Issues**:
- Generic `<div>` elements
- No ARIA landmarks
- Inconsistent heading levels

**Improvements**:

1. **Use Proper HTML5 Elements**:
   ```tsx
   <aside aria-label="Booking information">
     <section aria-labelledby="pricing-section">
       <h3 id="pricing-section" className="sr-only">Pricing</h3>
       {/* Content */}
     </section>
     <section aria-labelledby="dates-section">
       <h3 id="dates-section">Select Dates</h3>
       {/* Content */}
     </section>
   </aside>
   ```

2. **Add Screen Reader Context**:
   ```tsx
   <div aria-live="polite" aria-atomic="true">
     {calculation && (
       <span className="sr-only">
         Total price: ${calculation.total} for {calculation.days} days
       </span>
     )}
   </div>
   ```

3. **Improve Focus Management**:
   - Ensure logical tab order
   - Add skip links if needed
   - Trap focus in date popovers when open

#### 3.2 Color & Contrast

**Verify**:
- All text meets WCAG AA contrast ratios (4.5:1 for normal text)
- Error states are not conveyed by color alone
- Focus indicators are clearly visible

**Test**: Use browser dev tools to verify contrast in both light and dark modes

#### 3.3 Keyboard Navigation

**Required**:
- All interactive elements keyboard accessible
- Escape key closes popovers
- Enter/Space activates buttons
- Arrow keys navigate within calendars

---

### Phase 4: State Management

#### 4.1 Extract Custom Hooks

Create focused hooks for sidebar logic:

**`useBookingSidebar.ts`**:
```typescript
export const useBookingSidebar = (listingId: string) => {
  const [dateRange, setDateRange] = useState<DateRange>();
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [calculation, setCalculation] = useState<BookingCalculation | null>(null);
  
  // Logic for conflicts checking, calculation, etc.
  
  return {
    dateRange,
    setDateRange,
    conflicts,
    calculation,
    // ... other state and handlers
  };
};
```

**`useDateRangePicker.ts`**:
```typescript
export const useDateRangePicker = (
  onChange: (range: DateRange) => void
) => {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const handleStartDateSelect = (date: Date | undefined) => {
    // Logic
  };
  
  const handleEndDateSelect = (date: Date | undefined) => {
    // Logic
  };
  
  return {
    startDateOpen,
    setStartDateOpen,
    endDateOpen,
    setEndDateOpen,
    handleStartDateSelect,
    handleEndDateSelect,
  };
};
```

#### 4.2 Memoization

Prevent unnecessary re-renders:

```typescript
const memoizedCalculation = useMemo(
  () => calculation,
  [calculation?.total, calculation?.days]
);

const datePickerProps = useMemo(
  () => ({ dateRange, onDateRangeChange, conflicts }),
  [dateRange, conflicts]
);
```

---

### Phase 5: Testing Strategy

#### 5.1 Unit Tests

Create tests for each component:

```typescript
// __tests__/booking/sidebar/PricingHeader.test.tsx
describe('PricingHeader', () => {
  it('displays daily rate correctly', () => {});
  it('shows rating when available', () => {});
  it('hides rating when avgRating is 0', () => {});
  it('formats large prices with commas', () => {});
});
```

#### 5.2 Integration Tests

Test sidebar interactions:

```typescript
// __tests__/booking/BookingSidebar.integration.test.tsx
describe('BookingSidebar', () => {
  it('calculates total when dates selected', () => {});
  it('shows conflicts for unavailable dates', () => {});
  it('disables booking button when conflicts exist', () => {});
  it('handles booking flow correctly', () => {});
});
```

#### 5.3 Accessibility Tests

Use `@testing-library/jest-dom` and `axe-core`:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<BookingSidebar {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Implementation Order

### Week 1: Foundation
1. Create directory structure: `src/components/booking/sidebar/`
2. Extract `PricingHeader` component
3. Extract `LocationContact` component
4. Write unit tests for both

### Week 2: Complex Components
1. Extract `DateSelector` component
2. Create `useDateRangePicker` hook
3. Extract `PricingBreakdown` component
4. Write unit tests

### Week 3: Integration
1. Extract `BookingButton` component
2. Create main `BookingSidebar` component
3. Update `EquipmentDetailDialog` to use new components
4. Integration testing

### Week 4: Polish
1. Implement accessibility improvements
2. Add responsive refinements
3. Performance optimization (memoization)
4. Documentation and cleanup

---

## File Structure (After Refactoring)

```
src/components/booking/
├── BookingSidebar.tsx              # Main container
├── sidebar/
│   ├── PricingHeader.tsx           # ~40 lines
│   ├── LocationContact.tsx         # ~35 lines
│   ├── DateSelector.tsx            # ~120 lines
│   ├── PricingBreakdown.tsx        # ~80 lines
│   └── BookingButton.tsx           # ~45 lines
├── hooks/
│   ├── useBookingSidebar.ts        # ~80 lines
│   └── useDateRangePicker.ts       # ~60 lines
└── __tests__/
    ├── BookingSidebar.test.tsx
    └── sidebar/
        ├── PricingHeader.test.tsx
        ├── LocationContact.test.tsx
        ├── DateSelector.test.tsx
        ├── PricingBreakdown.test.tsx
        └── BookingButton.test.tsx
```

---

## Success Metrics

### Code Quality
- [ ] Each component under 150 lines
- [ ] 80%+ test coverage
- [ ] No eslint warnings
- [ ] All components have TypeScript interfaces

### Performance
- [ ] No unnecessary re-renders (use React DevTools Profiler)
- [ ] Lighthouse score 90+ on performance
- [ ] First contentful paint < 1.5s

### Accessibility
- [ ] 0 axe violations
- [ ] Keyboard navigation works perfectly
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] WCAG 2.1 AA compliant

### User Experience
- [ ] Clear visual hierarchy
- [ ] Responsive on all breakpoints
- [ ] Error states are clear
- [ ] Loading states are informative

---

## Common Pitfalls to Avoid

### 1. Over-Extraction
**Don't**: Create a component for every 5 lines of code
**Do**: Extract when there's a clear responsibility or reusability need

### 2. Prop Drilling
**Don't**: Pass 10+ props through multiple levels
**Do**: Use composition or context when appropriate

### 3. Premature Optimization
**Don't**: Add useMemo/useCallback everywhere
**Do**: Profile first, optimize only where needed

### 4. Inconsistent Patterns
**Don't**: Mix different state management approaches
**Do**: Be consistent with hooks, props, and naming

### 5. Ignoring Mobile
**Don't**: Design only for desktop
**Do**: Test on real devices, consider touch targets

---

## Maintenance Guidelines

### Adding New Features

When adding features to the sidebar:

1. **Identify the right component**: Which sidebar section should contain it?
2. **Update props interface**: Add TypeScript types
3. **Write tests first**: TDD approach
4. **Update documentation**: JSDoc comments
5. **Test accessibility**: Run axe, test with keyboard

### Modifying Existing Components

1. Check for breaking changes in props
2. Update unit tests
3. Run full integration tests
4. Verify in Storybook (if implemented)
5. Test both light and dark themes

---

## Additional Recommendations

### 1. Consider Storybook

Add Storybook for component development:

```bash
npx storybook@latest init
```

Create stories for each sidebar component to develop in isolation.

### 2. Add Animation

Consider subtle animations for better UX:

```typescript
// Use framer-motion for smooth transitions
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <PricingBreakdown />
</motion.div>
```

### 3. Error Boundaries

Wrap the sidebar in an error boundary:

```tsx
<ErrorBoundary fallback={<SidebarError />}>
  <BookingSidebar {...props} />
</ErrorBoundary>
```

### 4. Analytics

Add tracking for user interactions:

```typescript
// Track important actions
const handleBooking = () => {
  analytics.track('booking_initiated', {
    listingId,
    totalAmount: calculation.total,
    duration: calculation.days,
  });
  onBook();
};
```

---

## Resources

### Documentation
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives) - For accessible components
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - For styling patterns
- [React Hook Form](https://react-hook-form.com/) - If adding form validation

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Testing
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [React Testing Examples](https://testing-library.com/docs/react-testing-library/example-intro)

---

## Conclusion

This refactoring will:
- ✅ Improve code maintainability (smaller, focused components)
- ✅ Enhance reusability (components can be used elsewhere)
- ✅ Boost accessibility (semantic HTML, ARIA labels)
- ✅ Better testability (isolated unit tests)
- ✅ Clearer hierarchy (visual and semantic)
- ✅ Easier to extend (add features to specific components)

**Estimated Time**: 3-4 weeks for complete implementation including tests

**Risk Level**: Low (incremental changes, backward compatible)

**Priority**: Medium-High (improves code quality without blocking features)

---

## Questions or Issues?

When implementing, if you encounter:
- **Type errors**: Ensure all interfaces are properly exported
- **Style conflicts**: Check Tailwind class precedence
- **Test failures**: Verify mocks match actual component props
- **Accessibility issues**: Use browser dev tools and screen readers

Good luck with the refactoring! 🚀
