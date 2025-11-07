# EquipmentDetailDialog Refactoring Plan

## Objective
Refactor the `EquipmentDetailDialog` component to improve code organization, readability, and maintainability by extracting UI sections into smaller, focused sub-components. **The sidebar (BookingSidebar) must remain untouched.**

---

## Shadcn/UI Components Reference

This refactoring uses several shadcn/ui components. Here's the reference documentation for each:

### Badge Component
**Installation**: `npx shadcn@latest add badge`

**Import**:
```tsx
import { Badge } from "@/components/ui/badge"
```

**Usage**:
```tsx
<Badge variant="default | outline | secondary | destructive">Badge</Badge>
```

**Variants**: `default`, `outline`, `secondary`, `destructive`

---

### Card Component
**Installation**: `npx shadcn@latest add card`

**Import**:
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
```

**Usage**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

---

### Separator Component
**Installation**: `npx shadcn@latest add separator`

**Import**:
```tsx
import { Separator } from "@/components/ui/separator"
```

**Usage**:
```tsx
<Separator />
```

**Purpose**: Creates visual or semantic dividers between content sections

---

### Tabs Component
**Installation**: `npx shadcn@latest add tabs`

**Import**:
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```

**Usage**:
```tsx
<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Make changes to your account here.</TabsContent>
  <TabsContent value="password">Change your password here.</TabsContent>
</Tabs>
```

**Key Props**:
- `defaultValue`: Sets the initially active tab
- `value`: Controlled tab value
- `onValueChange`: Callback when tab changes

---

### Dialog Component
**Installation**: `npx shadcn@latest add dialog`

**Import**:
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
```

**Purpose**: Modal overlay for displaying content (used in main component, not being extracted)

---

### Sheet Component
**Installation**: `npx shadcn@latest add sheet`

**Import**:
```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
```

**Purpose**: Slide-over panel for mobile views (used in main component, not being extracted)

---

### Component Installation Notes

**All components should already be installed** in the project since they're currently used in `EquipmentDetailDialog.tsx`. However, if you encounter import errors:

1. Check if components exist in `src/components/ui/` directory
2. Install missing components: `npx shadcn@latest add [component-name]`
3. Verify imports use the correct path alias (`@/components/ui/`)

**Dependencies**: These components are built on Radix UI primitives and styled with Tailwind CSS

## Current State Analysis

### File Location
`src/components/equipment/EquipmentDetailDialog.tsx` (832 lines)

### Current Structure Issues
1. **Large monolithic component**: 832 lines with mixed concerns
2. **Inline JSX blocks**: Header (lines 444-470), photo gallery (lines 475-524), and tab contents are embedded directly
3. **Poor reusability**: Sections like the metadata card (lines 586-626) could be reused elsewhere
4. **Difficult maintenance**: Changes to one section require navigating through hundreds of lines
5. **Tab content complexity**: Each tab has inline JSX that could be componentized

### What Must NOT Be Changed
- **BookingSidebar component** (line 775): Keep exactly as is
- **Sidebar props and state management**: All props passed to BookingSidebar must remain identical
- **Booking logic**: Functions like `handleBooking`, `handleStartDateSelect`, `handleEndDateSelect`, etc.
- **State management**: All useState and useCallback hooks related to booking functionality
- **Grid layout**: The `lg:grid-cols-[1fr_380px]` layout that positions sidebar on the right

---

## Refactoring Steps

### Step 1: Create EquipmentHeader Component

**New File**: `src/components/equipment/EquipmentHeader.tsx`

**Purpose**: Display equipment title, location, rating, and condition badge

**Props Interface**:
```typescript
interface EquipmentHeaderProps {
  title: string;
  location: string;
  condition: string;
  avgRating: number;
  reviewCount: number;
}
```

**Component Structure**:
- Export named component: `export const EquipmentHeader`
- Contains the header section from lines 444-470
- Includes:
  - Title (h1 with styling)
  - Location with MapPin icon
  - Star rating (when avgRating > 0)
  - Review count display
  - Condition badge

**Imports Needed**:
- `MapPin` from "lucide-react"
- `StarRating` from "@/components/reviews/StarRating"
- `Badge` from "@/components/ui/badge" *(shadcn/ui)*

**Shadcn Components Used**: `Badge`

**Code to Extract**: Lines 444-470 from EquipmentDetailDialog.tsx

---

### Step 2: Create EquipmentPhotoGallery Component

**New File**: `src/components/equipment/EquipmentPhotoGallery.tsx`

**Purpose**: Display equipment photos in Airbnb-style grid layout

**Types**:
```typescript
interface Photo {
  id: string;
  photo_url: string;
}

interface EquipmentPhotoGalleryProps {
  photos: Photo[];
  equipmentTitle: string;
}
```

**Component Structure**:
- Export named component: `export const EquipmentPhotoGallery`
- Contains the photo gallery section from lines 475-524
- Early return `null` if `photos.length === 0`
- Calculate `primaryPhoto` (first photo) and `secondaryPhotos` (next 4 photos)
- Implements grid layout:
  - `grid-cols-1 md:grid-cols-[60%_40%]`
  - Primary photo on left (60% width on desktop)
  - Secondary photos grid on right (40% width, 2x2 grid)
- Features:
  - Hover opacity effects
  - Lazy loading
  - "+X more" overlay on 4th secondary photo if more than 5 total photos
  - Empty cell placeholders if fewer than 4 secondary photos

**Imports Needed**: None (pure JSX)

**Shadcn Components Used**: None (pure HTML/JSX with Tailwind CSS)

**Code to Extract**: Lines 475-524 from EquipmentDetailDialog.tsx

---

### Step 3: Create EquipmentMetadataCard Component

**New File**: `src/components/equipment/EquipmentMetadataCard.tsx`

**Purpose**: Display equipment metadata (condition and category) in a card

**Props Interface**:
```typescript
interface Category {
  name: string;
}

interface EquipmentMetadataCardProps {
  condition: string;
  category: Category | null;
}
```

**Component Structure**:
- Export named component: `export const EquipmentMetadataCard`
- Contains the metadata card from lines 586-626 in the overview tab
- Displays:
  - Condition section with CheckCircle2 icon
  - Vertical divider
  - Category section with dynamic icon (via getCategoryIcon) or fallback Package icon
- Uses Card component wrapper

**Imports Needed**:
- `CheckCircle2`, `Package` from "lucide-react"
- `getCategoryIcon` from "@/lib/categoryIcons"
- `Card` from "@/components/ui/card" *(shadcn/ui)*
- `Badge` from "@/components/ui/badge" *(shadcn/ui)*

**Shadcn Components Used**: `Card`, `Badge`

**Code to Extract**: Lines 586-626 from EquipmentDetailDialog.tsx (within overview tab)

---

### Step 4: Create EquipmentOverviewTab Component

**New File**: `src/components/equipment/EquipmentOverviewTab.tsx`

**Purpose**: Display the overview tab content (description and metadata)

**Props Interface**:
```typescript
interface Category {
  name: string;
}

interface EquipmentOverviewTabProps {
  description: string;
  condition: string;
  category: Category | null;
}
```

**Component Structure**:
- Export named component: `export const EquipmentOverviewTab`
- Contains the TabsContent for "overview" from lines 580-635
- Structure:
  - "About this item" heading (h2)
  - Description paragraph with `whitespace-pre-wrap`
  - EquipmentMetadataCard component (from Step 3)
- Wrapped in `<div className="space-y-6">`

**Imports Needed**:
- `EquipmentMetadataCard` from "./EquipmentMetadataCard"

**Shadcn Components Used**: None directly (uses EquipmentMetadataCard which uses Card and Badge)

**Code to Extract**: Lines 586-635 from EquipmentDetailDialog.tsx (TabsContent content only, not TabsContent wrapper)

---

### Step 5: Update EquipmentDetailDialog Component

**File to Modify**: `src/components/equipment/EquipmentDetailDialog.tsx`

**Changes Required**:

#### 5.1: Add New Imports (at top of file, after existing imports)
```typescript
import { EquipmentHeader } from "./EquipmentHeader";
import { EquipmentPhotoGallery } from "./EquipmentPhotoGallery";
import { EquipmentOverviewTab } from "./EquipmentOverviewTab";
```

#### 5.2: Replace Header Section (Lines 444-470)
**Find** (lines 444-470):
```tsx
        {/* Header with meta info */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {data.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {data.location}
                </div>
                {avgRating > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={avgRating} size="sm" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    {data.reviews && data.reviews.length > 0 && (
                      <span>({data.reviews.length})</span>
                    )}
                  </div>
                )}
                <Badge variant="outline" className="capitalize">
                  {data.condition}
                </Badge>
              </div>
            </div>
          </div>
        </div>
```

**Replace with**:
```tsx
        {/* Header with meta info */}
        <EquipmentHeader
          title={data.title}
          location={data.location}
          condition={data.condition}
          avgRating={avgRating}
          reviewCount={data.reviews?.length || 0}
        />
```

#### 5.3: Replace Photo Gallery Section (Lines 475-524)
**Find** (lines 475-524):
```tsx
        {/* Photo Gallery - Airbnb style */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-2 h-[300px] sm:h-[400px] md:h-[500px]">
              {/* Primary large image */}
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={primaryPhoto.photo_url}
                  alt={data.title}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </div>

              {/* Secondary images grid */}
              {secondaryPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {secondaryPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative rounded-lg overflow-hidden border border-border group"
                    >
                      <img
                        src={photo.photo_url}
                        alt={`${data.title} - ${idx + 2}`}
                        className="w-full h-full object-cover cursor-pointer group-hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                      {photos.length > 5 && idx === 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                          +{photos.length - 5} more
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Fill empty cells if needed */}
                  {secondaryPhotos.length < 4 &&
                    Array.from({ length: 4 - secondaryPhotos.length }).map(
                      (_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          className="rounded-lg border border-border bg-muted"
                          aria-hidden="true"
                        />
                      )
                    )}
                </div>
              )}
            </div>
          </div>
        )}
```

**Replace with**:
```tsx
        {/* Photo Gallery - Airbnb style */}
        <EquipmentPhotoGallery
          photos={photos}
          equipmentTitle={data.title}
        />
```

#### 5.4: Remove Local Photo Variables (Lines 413-415)
**Find and DELETE** (lines ~413-415):
```typescript
  const photos = data?.photos || [];
  const primaryPhoto = photos[0];
  const secondaryPhotos = photos.slice(1, 5); // Up to 4 secondary photos
```

**Replace with**:
```typescript
  const photos = data?.photos || [];
```
(Only keep the first line, remove the other two)

#### 5.5: Replace Overview Tab Content (Lines 580-635)
**Find** (lines 580-635 - content inside TabsContent):
```tsx
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div>
                  <h2 className="text-xl font-semibold mb-3">
                    About this item
                  </h2>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.description}
                  </p>
                </div>

                <Card>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Condition */}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Condition
                          </span>
                          <Badge variant="outline" className="capitalize w-fit">
                            {data.condition}
                          </Badge>
                        </div>
                      </div>

                      {/* Vertical divider */}
                      <div className="h-8 w-px bg-border" />

                      {/* Category */}
                      <div className="flex items-center gap-2">
                        {data.category &&
                          (() => {
                            const CategoryIcon = getCategoryIcon(
                              data.category.name
                            );
                            return (
                              <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            );
                          })()}
                        {!data.category && (
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Category
                          </span>
                          <Badge variant="secondary" className="w-fit">
                            {data.category?.name || "N/A"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
```

**Replace with**:
```tsx
              <TabsContent value="overview" className="space-y-6 mt-6">
                <EquipmentOverviewTab
                  description={data.description}
                  condition={data.condition}
                  category={data.category}
                />
              </TabsContent>
```

#### 5.6: Remove Unused Imports (if not used elsewhere)
After the refactoring, remove these imports if they're no longer used in EquipmentDetailDialog:
- `Package` (now only in EquipmentMetadataCard)
- `CheckCircle2` (now only in EquipmentMetadataCard)

**Note**: Keep `MapPin`, `Badge`, and `getCategoryIcon` if used elsewhere in the file. Only remove if truly unused.

---

## Implementation Order

Execute in this exact sequence:

1. ✅ **Verify Shadcn/UI Components** (Pre-step)
   - Check all required components exist in `src/components/ui/`
   - Verify imports work by running `npm run build` or `npm run type-check`
   
2. ✅ **Create EquipmentHeader.tsx** (Step 1)
3. ✅ **Create EquipmentPhotoGallery.tsx** (Step 2)
4. ✅ **Create EquipmentMetadataCard.tsx** (Step 3)
5. ✅ **Create EquipmentOverviewTab.tsx** (Step 4) - Must be after Step 3
6. ✅ **Update EquipmentDetailDialog.tsx** (Step 5) - Must be last

---

## Pre-Implementation: Verify Shadcn/UI Setup

Before starting the refactoring, verify all required shadcn/ui components are properly installed:

### Step 1: Check Component Files Exist
```bash
# Navigate to project root
cd /Users/mykolborghese/RentAloo-ai/rentaloo-ai

# Check for required component files
ls -la src/components/ui/badge.tsx
ls -la src/components/ui/card.tsx
ls -la src/components/ui/separator.tsx
ls -la src/components/ui/tabs.tsx
ls -la src/components/ui/dialog.tsx
ls -la src/components/ui/sheet.tsx
```

**Expected Result**: All files should exist (they're already used in EquipmentDetailDialog)

---

### Step 2: Verify Package Dependencies
```bash
# Check if Radix UI dependencies are installed
npm list @radix-ui/react-separator @radix-ui/react-tabs @radix-ui/react-dialog
```

**Expected Result**: All packages should be listed without errors

---

### Step 3: Test Imports
Create a temporary test file to verify imports work:

```bash
# Create test file
cat > src/test-imports.tsx << 'EOF'
// Test shadcn/ui imports
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

console.log("All imports successful");
EOF

# Run TypeScript check
npx tsc --noEmit src/test-imports.tsx

# Clean up test file
rm src/test-imports.tsx
```

**Expected Result**: No TypeScript errors

---

### Step 4: If Components Are Missing

If any component is missing, install it:

```bash
# Install individual components as needed
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add separator
npx shadcn@latest add tabs

# Or install all at once
npx shadcn@latest add badge card separator tabs
```

---

## Implementation Order

## Testing Checklist

After refactoring, verify:

### Visual Testing
- [ ] Equipment detail dialog opens correctly
- [ ] Header displays title, location, rating, and condition badge
- [ ] Photo gallery displays in correct grid layout (60/40 split on desktop)
- [ ] Photo gallery shows "+X more" overlay when >5 photos
- [ ] Overview tab shows description and metadata card
- [ ] Metadata card shows condition and category with correct icons
- [ ] All 5 tabs are clickable and display content
- [ ] Mobile responsiveness works (Sheet component)

### Functional Testing
- [ ] **BookingSidebar still works exactly as before** (CRITICAL)
- [ ] Date selection works
- [ ] Price calculation updates correctly
- [ ] Booking request creation works
- [ ] Payment flow works
- [ ] Tab navigation works
- [ ] Dialog open/close works

### Code Quality
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All imports resolve correctly
- [ ] Props are correctly typed
- [ ] Component names follow naming conventions

---

## Rollback Plan

If issues occur:

1. **Revert commits**: Use git to revert to previous working state
2. **File-by-file rollback**: Delete new component files and restore original EquipmentDetailDialog.tsx from version control
3. **Specific component issues**: If only one new component has issues, revert that component and inline its code back into EquipmentDetailDialog

---

## Benefits After Refactoring

1. **Reduced complexity**: Main component drops from 832 lines to ~700 lines
2. **Better organization**: Each UI section has its own file with clear responsibility
3. **Easier maintenance**: Changes to header, gallery, or overview are isolated
4. **Improved reusability**: New components can be used in other views (e.g., mobile-specific pages)
5. **Better testing**: Individual components can be unit tested in isolation
6. **Clearer dependencies**: Each component explicitly declares its required props
7. **Enhanced readability**: Developers can understand component structure at a glance

---

## Risk Assessment

### Low Risk Items
- EquipmentHeader: Simple presentational component, no side effects
- EquipmentPhotoGallery: Pure UI component, no state or effects
- EquipmentMetadataCard: Simple data display, no logic

### Medium Risk Items
- EquipmentOverviewTab: Depends on EquipmentMetadataCard integration

### No Risk Items
- BookingSidebar: **NOT BEING TOUCHED**
- Booking logic: Remains unchanged in parent component
- State management: All useState/useCallback hooks stay in parent

---

## Success Criteria

The refactoring is successful when:

1. ✅ All new components are created with correct TypeScript types
2. ✅ EquipmentDetailDialog imports and uses new components
3. ✅ All visual elements render identically to before
4. ✅ No functionality is broken (especially booking/payment flow)
5. ✅ BookingSidebar works exactly as before
6. ✅ No TypeScript or ESLint errors
7. ✅ Code is more maintainable and readable
8. ✅ All tests pass (if tests exist)

---

## Timeline Estimate

- Step 1 (EquipmentHeader): 15 minutes
- Step 2 (EquipmentPhotoGallery): 20 minutes
- Step 3 (EquipmentMetadataCard): 15 minutes
- Step 4 (EquipmentOverviewTab): 10 minutes
- Step 5 (Update main component): 25 minutes
- Testing: 30 minutes

**Total**: ~2 hours

---

---

## Troubleshooting Shadcn/UI Components

### Import Errors
**Problem**: `Module not found: Can't resolve '@/components/ui/badge'`

**Solutions**:
1. Verify the component file exists: `ls src/components/ui/badge.tsx`
2. Check path alias in `tsconfig.json` or `vite.config.ts`:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
3. Install missing component: `npx shadcn@latest add badge`

---

### Styling Issues
**Problem**: Component appears unstyled or styles are not applied

**Solutions**:
1. Verify Tailwind CSS is configured in `tailwind.config.js`
2. Check that global styles are imported in `main.tsx` or `App.tsx`
3. Ensure CSS layers are defined in your global CSS:
   ```css
   @layer base, components, utilities;
   ```
4. Verify Radix UI primitives are installed (check `package.json`)

---

### Type Errors
**Problem**: TypeScript errors with component props

**Solutions**:
1. Check that the correct prop types are imported
2. Verify TypeScript version compatibility (≥ 4.5)
3. Run `npm install` to ensure all type definitions are installed
4. Check shadcn/ui documentation for correct prop usage

---

### Radix UI Dependency Issues
**Problem**: Missing Radix UI dependencies

**Solutions**:
1. Check if required Radix packages are installed:
   - Badge: No Radix dependency (pure CSS)
   - Card: No Radix dependency (pure CSS)
   - Separator: `@radix-ui/react-separator`
   - Tabs: `@radix-ui/react-tabs`
2. Install manually if needed:
   ```bash
   npm install @radix-ui/react-separator @radix-ui/react-tabs
   ```

---

## Notes for Executor

1. **Do NOT modify BookingSidebar**: The sidebar component and all its props/logic must remain untouched
2. **Preserve all spacing**: Maintain the same `space-y-6` and other spacing utilities
3. **Keep classNames identical**: Don't change Tailwind classes unless absolutely necessary
4. **Test incrementally**: Test after each component creation before moving to the next
5. **Use exact line numbers**: The line numbers provided are approximate; search for the actual code blocks
6. **Check for additional usages**: Before removing imports, verify they're not used elsewhere in the file
7. **Maintain TypeScript strictness**: Ensure all props are properly typed with interfaces
8. **Follow naming conventions**: Use PascalCase for components, camelCase for props
9. **Export style consistency**: Use named exports (`export const`) for all new components

---

## Questions to Ask Before Starting

1. Are there any existing tests for EquipmentDetailDialog?
2. Is there a component library documentation to follow?
3. Should the new components be added to a component index/export file?
4. Are there any accessibility requirements to consider?
5. Should we add Storybook stories for the new components?

---

## Post-Refactoring Opportunities

After successful refactoring, consider:

1. **Extract remaining tabs**: Create components for Availability, Location, Reviews, and Book tabs
2. **Add unit tests**: Write tests for each new component
3. **Storybook integration**: Add stories to showcase components in isolation
4. **Performance optimization**: Memoize components with React.memo if needed
5. **Accessibility audit**: Ensure all components meet WCAG standards
6. **Documentation**: Add JSDoc comments to component props

---

## Quick Reference: Shadcn/UI Component Usage by File

| New Component File | Shadcn/UI Components Used | Installation Command |
|-------------------|---------------------------|---------------------|
| `EquipmentHeader.tsx` | `Badge` | `npx shadcn@latest add badge` |
| `EquipmentPhotoGallery.tsx` | None | N/A |
| `EquipmentMetadataCard.tsx` | `Card`, `Badge` | `npx shadcn@latest add card badge` |
| `EquipmentOverviewTab.tsx` | None (uses child components) | N/A |
| `EquipmentDetailDialog.tsx` | `Dialog`, `Sheet`, `Separator`, `Tabs` | Already installed |

**Note**: All shadcn/ui components should already be installed since they're currently used in the existing `EquipmentDetailDialog.tsx` file.

---

## Shadcn/UI Component Variants Used

### Badge Variants
- `outline` - Used for condition badge in header
- `secondary` - Used for category badge in metadata card
- `outline` - Used for condition badge in metadata card

### Card Structure
- `Card` - Wrapper component
- Plain `div` with padding - Used instead of CardContent for custom layout

### Separator
- Default (no variants) - Used between major sections

### Tabs
- Controlled mode with `value` and `onValueChange` props
- Five tabs: Overview, Availability, Location, Reviews, Book

