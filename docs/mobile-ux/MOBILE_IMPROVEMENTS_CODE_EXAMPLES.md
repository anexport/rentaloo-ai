# Mobile Usability Improvements - Code Examples

This document provides specific code examples for implementing the recommended mobile usability improvements.

## 1. Increase Button and Input Touch Targets

### Update: src/components/ui/button-variants.ts

```typescript
// BEFORE
export const buttonVariants = cva(
  // ... base classes ...
  {
    variants: {
      size: {
        default: "h-9 px-4 py-2",        // 36px - TOO SMALL
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",  // 32px - TOO SMALL
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",           // 40px - BORDERLINE
        icon: "size-9",                   // 36px - TOO SMALL
        "icon-sm": "size-8",              // 32px - TOO SMALL
        "icon-lg": "size-10",             // 40px - BORDERLINE
      },
    },
  }
);

// AFTER
export const buttonVariants = cva(
  // ... base classes ...
  {
    variants: {
      size: {
        default: "h-10 px-4 py-2.5",      // 40px - BETTER (was 36px)
        sm: "h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",  // 36px (was 32px)
        lg: "h-11 rounded-md px-6 has-[>svg]:px-4",           // 44px (was 40px)
        icon: "size-10",                  // 40px (was 36px)
        "icon-sm": "size-9",              // 36px (was 32px)
        "icon-lg": "size-11",             // 44px (was 40px)
      },
    },
  }
);
```

### Update: src/components/ui/input.tsx

```typescript
// BEFORE
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs ...",
        // h-9 = 36px (TOO SMALL), py-1 = 4px (minimal padding)
        className
      )}
      {...props}
    />
  )
}

// AFTER
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-2.5 text-base shadow-xs ...",
        // h-10 = 40px (BETTER), py-2.5 = 10px (better vertical padding)
        className
      )}
      {...props}
    />
  )
}
```

---

## 2. Add Mobile Keyboard Optimization

### Update: src/components/auth/LoginModal.tsx

```typescript
// BEFORE
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    {...register("email")}
    placeholder="Enter your email"
  />
  {errors.email && (
    <p className="text-sm text-destructive">
      {errors.email.message}
    </p>
  )}
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    autoComplete="email"
    autoCapitalize="off"
    spellCheck="false"
    {...register("email")}
    placeholder="Enter your email"
  />
  {errors.email && (
    <p className="text-sm text-destructive">
      {errors.email.message}
    </p>
  )}
</div>

// BEFORE
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      {...register("password")}
      placeholder="Enter your password"
    />
    {/* password toggle button */}
  </div>
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      autoComplete="current-password"
      {...register("password")}
      placeholder="Enter your password"
    />
    {/* password toggle button */}
  </div>
</div>
```

### Update: src/components/auth/RenterSignupForm.tsx

```typescript
// BEFORE
<div className="space-y-2">
  <Label htmlFor="email" className="flex items-center gap-2">
    <Mail className="h-4 w-4 text-muted-foreground" />
    Email
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="email"
    type="email"
    {...register("email")}
    placeholder="john@example.com"
  />
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="email" className="flex items-center gap-2">
    <Mail className="h-4 w-4 text-muted-foreground" />
    Email
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="email"
    type="email"
    autoComplete="email"
    autoCapitalize="off"
    spellCheck="false"
    {...register("email")}
    placeholder="john@example.com"
  />
</div>

// BEFORE
<div className="space-y-2">
  <Label htmlFor="location" className="flex items-center gap-2">
    <MapPin className="h-4 w-4 text-muted-foreground" />
    Location
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="location"
    {...register("location")}
    placeholder="San Francisco, CA"
  />
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="location" className="flex items-center gap-2">
    <MapPin className="h-4 w-4 text-muted-foreground" />
    Location
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="location"
    type="text"
    autoComplete="street-address"
    {...register("location")}
    placeholder="San Francisco, CA"
  />
</div>
```

### Update: src/components/auth/OwnerSignupForm.tsx

```typescript
// Add autoComplete to email field (same as RenterSignupForm above)

// BEFORE
<div className="space-y-2">
  <Label htmlFor="yearsExperience" className="flex items-center gap-2">
    <Award className="h-4 w-4 text-muted-foreground" />
    Years of Experience
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="yearsExperience"
    type="number"
    min="1"
    {...register("yearsExperience", { valueAsNumber: true })}
    placeholder="5"
  />
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="yearsExperience" className="flex items-center gap-2">
    <Award className="h-4 w-4 text-muted-foreground" />
    Years of Experience
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="yearsExperience"
    type="number"
    inputMode="numeric"
    min="1"
    {...register("yearsExperience", { valueAsNumber: true })}
    placeholder="5"
  />
</div>

// BEFORE
<div className="space-y-2">
  <Label htmlFor="location" className="flex items-center gap-2">
    <MapPin className="h-4 w-4 text-muted-foreground" />
    Location
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="location"
    {...register("location")}
    placeholder="San Francisco, CA"
  />
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="location" className="flex items-center gap-2">
    <MapPin className="h-4 w-4 text-muted-foreground" />
    Location
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="location"
    type="text"
    autoComplete="street-address"
    {...register("location")}
    placeholder="San Francisco, CA"
  />
</div>

// BEFORE
<div className="space-y-2">
  <Label htmlFor="serviceArea" className="flex items-center gap-2">
    <Navigation className="h-4 w-4 text-muted-foreground" />
    Service Area
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="serviceArea"
    {...register("serviceArea")}
    placeholder="50 miles radius"
  />
</div>

// AFTER
<div className="space-y-2">
  <Label htmlFor="serviceArea" className="flex items-center gap-2">
    <Navigation className="h-4 w-4 text-muted-foreground" />
    Service Area
    <span className="text-destructive">*</span>
  </Label>
  <Input
    id="serviceArea"
    type="text"
    inputMode="text"
    {...register("serviceArea")}
    placeholder="50 miles radius"
  />
</div>
```

---

## 3. Fix Password Visibility Toggle Positioning

### Update: src/components/auth/LoginModal.tsx

```typescript
// BEFORE - Absolutely positioned (hard to tap on mobile)
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      {...register("password")}
      placeholder="Enter your password"
    />
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
      onClick={handleTogglePassword}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </Button>
  </div>
</div>

// AFTER - Better positioned with proper padding
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      {...register("password")}
      placeholder="Enter your password"
      className="pr-10"  // Add padding for toggle space
    />
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"  // h-9 minimum touch target
      className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent"
      onClick={handleTogglePassword}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </Button>
  </div>
</div>
```

### Apply the same fix to: src/components/auth/RenterSignupForm.tsx (lines ~295-319 and ~335-362)

### Apply the same fix to: src/components/auth/OwnerSignupForm.tsx (lines ~363-388 and ~404-431)

---

## 4. Fix Submit Button Layout on BookingRequestForm

### Update: src/components/booking/BookingRequestForm.tsx

```typescript
// BEFORE - Right-aligned buttons (bad on mobile)
<div className="flex justify-end space-x-4">
  {onCancel && (
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  )}
  <Button
    type="submit"
    disabled={!canSubmit || isSubmitting}
    className="min-w-[120px]"
  >
    {isSubmitting ? "Processing..." : "Continue to Payment"}
  </Button>
</div>

// AFTER - Full width on mobile, end-aligned on desktop
<div className="grid grid-cols-2 md:flex md:justify-end gap-2 md:gap-4 pt-6">
  {onCancel && (
    <Button 
      type="button" 
      variant="outline" 
      onClick={onCancel}
      className="md:w-auto"
    >
      Cancel
    </Button>
  )}
  <Button
    type="submit"
    disabled={!canSubmit || isSubmitting}
    className="md:min-w-[120px]"
  >
    {isSubmitting ? "Processing..." : "Continue to Payment"}
  </Button>
</div>
```

---

## 5. Add Icons to Error Messages

### Update: src/components/auth/RenterSignupForm.tsx (and similar patterns in all forms)

```typescript
// BEFORE - Text only
{errors.fullName && (
  <p id="fullName-error" className="text-sm text-destructive">
    {errors.fullName.message}
  </p>
)}

// AFTER - With icon
{errors.fullName && (
  <p id="fullName-error" className="text-sm text-destructive flex items-center gap-1.5">
    <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
    {errors.fullName.message}
  </p>
)}

// Note: Import AlertCircle at top of file
import { AlertCircle } from "lucide-react";
```

---

## 6. Ensure Date Picker Popovers Fit Mobile Viewport

### Update: src/components/booking/sidebar/DateSelector.tsx

```typescript
// BEFORE - Auto width might overflow on small screens
<PopoverContent className="w-auto p-0" align="start">
  <AvailabilityIndicatorCalendar
    mode="single"
    selected={dateRange?.from}
    onSelect={handleStartDateSelect}
    disabled={(date) => startOfDay(date) < startOfDay(today)}
    isDateAvailable={isDateAvailable}
    loading={availabilityLoading}
    initialFocus
  />
</PopoverContent>

// AFTER - Constrained width for mobile
<PopoverContent 
  className="w-[calc(100vw-2rem)] max-w-[min(100vw-2rem,400px)] p-0" 
  align="start"
>
  <AvailabilityIndicatorCalendar
    mode="single"
    selected={dateRange?.from}
    onSelect={handleStartDateSelect}
    disabled={(date) => startOfDay(date) < startOfDay(today)}
    isDateAvailable={isDateAvailable}
    loading={availabilityLoading}
    initialFocus
  />
</PopoverContent>
```

---

## 7. Improve Calendar Scroll on Mobile

### Update: src/components/ui/calendar.tsx

```typescript
// BEFORE - No mobile scroll handling
<DayPicker
  showOutsideDays={showOutsideDays}
  className={cn(
    "bg-background group/calendar p-3 [--cell-size:--spacing(8)]",
    className
  )}
  // ... rest of props ...
/>

// AFTER - Add scroll container for mobile viewports
<DayPicker
  showOutsideDays={showOutsideDays}
  className={cn(
    "bg-background group/calendar p-3 [--cell-size:--spacing(8)]",
    "max-h-[calc(100vh-200px)] md:max-h-none overflow-y-auto",
    className
  )}
  // ... rest of props ...
/>
```

---

## 8. Increase Error Text Size on Mobile

### Update: Across all forms

```typescript
// BEFORE
{errors.email && (
  <p className="text-sm text-destructive">
    {errors.email.message}
  </p>
)}

// AFTER - Larger on small screens, normal on desktop
{errors.email && (
  <p className="text-base md:text-sm text-destructive">
    {errors.email.message}
  </p>
)}

// Alternative: If you want consistent size, use text-sm but ensure good contrast
// The current implementation with text-sm and text-destructive color is actually OK
// The main improvement is adding the icon (see #5 above)
```

---

## 9. Add Missing autoComplete to Booking Forms

### Update: src/components/booking/BookingRequestForm.tsx

```typescript
// The date inputs already use type="date" which handles mobile well
// But if adding a location field in the future, add autoComplete

<Input
  id="location"
  type="text"
  autoComplete="street-address"
  placeholder="Pickup location"
  {...register("location")}
/>
```

---

## 10. Add Missing autoComplete to Equipment Listing Form

### Update: src/components/equipment/EquipmentListingForm.tsx

```typescript
// BEFORE
<Input
  id="location"
  {...register("location")}
  placeholder="San Francisco, CA"
/>

// AFTER
<Input
  id="location"
  type="text"
  autoComplete="street-address"
  {...register("location")}
  placeholder="San Francisco, CA"
/>

// BEFORE
<Input
  id="title"
  {...register("title")}
  placeholder="e.g., Mountain Bike"
/>

// AFTER
<Input
  id="title"
  type="text"
  autoComplete="off"  // Product names don't have autocomplete standard
  {...register("title")}
  placeholder="e.g., Mountain Bike"
/>
```

---

## Implementation Summary

### Files to Modify (Priority Order):

1. **src/components/ui/button-variants.ts** - 5 min
2. **src/components/ui/input.tsx** - 5 min
3. **src/components/auth/LoginModal.tsx** - 10 min
4. **src/components/auth/RenterSignupForm.tsx** - 10 min
5. **src/components/auth/OwnerSignupForm.tsx** - 10 min
6. **src/components/auth/LoginModal.tsx** (password toggle fix) - 5 min
7. **src/components/auth/RenterSignupForm.tsx** (password toggle fix) - 10 min
8. **src/components/auth/OwnerSignupForm.tsx** (password toggle fix) - 10 min
9. **src/components/booking/BookingRequestForm.tsx** - 10 min + 20 min (button layout)
10. **src/components/booking/sidebar/DateSelector.tsx** - 5 min
11. **src/components/ui/calendar.tsx** - 5 min
12. **src/components/equipment/EquipmentListingForm.tsx** - 10 min

**Total Estimated Time: 115-130 minutes (including testing)**

### Testing After Changes:

```bash
# 1. Type check for any issues
npx tsc --noEmit

# 2. Run tests
npm run test

# 3. Manual testing on mobile devices
# - Test actual phones (iPhone SE, Android)
# - Test form submission with various keyboards
# - Test autofill functionality
# - Test error display
# - Test date picker popovers
```

---

## Notes for Developers

1. **Touchscreen Testing**: Use actual devices, not just responsive design mode
2. **Keyboard Testing**: Test with virtual keyboard visible
3. **Focus Testing**: Ensure focus indicators are visible in mobile browsers
4. **Performance**: Increased sizes shouldn't impact performance significantly
5. **Consistency**: Apply these changes consistently across all forms
6. **Accessibility**: These changes improve both mobile UX and accessibility

---

