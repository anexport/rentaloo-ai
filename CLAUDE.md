# CLAUDE.md - AI Assistant Guide for RentAloo

Comprehensive guidance for AI assistants working on the RentAloo peer-to-peer rental marketplace.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Code Conventions](#code-conventions)
5. [Key Features](#key-features)
6. [Database Schema](#database-schema)
7. [Development Workflow](#development-workflow)
8. [Important Considerations](#important-considerations)

---

## Project Overview

**RentAloo** is a peer-to-peer rental marketplace enabling users to rent and lend equipment across various categories.

### Core Features
- **Dual User Roles**: Renter and owner experiences with role-specific dashboards
- **Equipment Management**: Full CRUD for listings with photos and availability
- **Smart Booking System**: Request-based booking with availability checking
- **Secure Payments**: Stripe integration with escrow system
- **Real-time Messaging**: Supabase Realtime for instant communication
- **Reviews & Ratings**: Comprehensive review system
- **Location-based Search**: Geographic search with map integration
- **Identity Verification**: Multi-step verification for trust and safety
- **Responsive Design**: Mobile-first approach

---

## Architecture & Tech Stack

**Frontend:**
- React 19.1.1, TypeScript 5.9.3 (strict mode), Vite 7.1.7, Node.js 22.x

**UI & Styling:**
- Tailwind CSS 4.1.16 (v4 with `@theme` syntax)
- Shadcn UI (New York variant), Radix UI, Lucide React
- CVA (Class Variance Authority), OKLCH color space

**Backend & Database:**
- Supabase 2.76.1 (PostgreSQL, RLS, Auth, Realtime, Storage)
- Auto-generated TypeScript types from schema

**State & Forms:**
- TanStack React Query 5.90.5, React Context API
- React Hook Form 7.65.0, Zod 4.1.12

**Key Libraries:**
- React Router DOM 7.9.4, Stripe, date-fns 4.1.0, Axios 1.13.0

**Testing:**
- Vitest 4.0.4, React Testing Library 16.3.0

---

## Directory Structure

### Root Structure
```
rentaloo-ai/
├── src/                     # Source code
├── supabase/                # Database migrations & edge functions
├── public/                  # Static assets
├── CLAUDE.md                # This file
├── README.md                # User documentation
├── package.json             # Dependencies
├── vite.config.ts           # Vite config
└── tsconfig.json            # TypeScript config
```

### src/ Structure (Feature-Based Organization)
```
src/
├── components/              # Feature-based components
│   ├── auth/                # LoginModal, SignupModal, signup forms
│   ├── booking/             # BookingSidebar, date selection, pricing
│   ├── equipment/           # ListingCard, detail dialogs, services/
│   ├── explore/             # Search, filters, map
│   ├── messaging/           # Real-time chat components
│   ├── payment/             # Stripe integration, escrow
│   ├── reviews/             # Review forms and display
│   ├── verification/        # Identity verification
│   └── ui/                  # Shadcn UI primitives (40+ components)
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities & API clients
├── pages/                   # Route-level components
├── types/                   # TypeScript definitions
├── contexts/                # React Context providers
├── features/                # Self-contained feature modules
├── App.tsx                  # Main app with routing
└── main.tsx                 # Entry point
```

**Key Principles:**
- Feature-based organization (components grouped by domain)
- NO barrel exports - import directly from file paths
- Service layer for data fetching (e.g., `equipment/services/listings.ts`)
- Clear separation: UI primitives vs feature components

---

## Code Conventions

### Naming
- **Files**: Components `PascalCase.tsx`, Hooks `useHook.ts`, Utils `camelCase.ts`
- **Components**: Default export, PascalCase
- **Props**: `ComponentNameProps`
- **Handlers**: `handle` prefix (`handleSubmit`, `handleClick`)
- **Booleans**: `is/has/show` prefix (`isLoading`, `hasData`)
- **Constants**: `SCREAMING_SNAKE_CASE`

### Imports
**Always use path aliases:**
```typescript
// ✅ CORRECT
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import type { Database } from "@/lib/database.types"

// ❌ WRONG
import { Button } from "../../components/ui/button"
```

### TypeScript Patterns
```typescript
// Extract types from Supabase schema
export type BookingStatus = Database["public"]["Tables"]["booking_requests"]["Row"]["status"]

// Zod validation
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
type FormData = z.infer<typeof schema>

// Function types
export const fetchListings = async (filters: ListingsFilters = {}): Promise<Listing[]> => { }
```

### Component Structure
```typescript
type ComponentProps = {
  data: DataType
  onSelect?: (id: string) => void
}

export default function Component({ data, onSelect }: ComponentProps) {
  if (!data) return null

  const handleClick = () => onSelect?.(data.id)

  return <div onClick={handleClick}>{/* JSX */}</div>
}
```

### State Management
- **Global state**: React Context (`AuthContext`, `ThemeContext`)
- **Server state**: React Query with 5min stale time
- **Forms**: React Hook Form + Zod
- **URL state**: `useSearchParams`

### Supabase Patterns
```typescript
// Query with relations
const { data, error } = await supabase
  .from("equipment")
  .select(`*, category:categories(*), photos:equipment_photos(*)`)
  .eq("is_available", true)

// Prevent N+1
const ownerIds = [...new Set(listings.map(l => l.owner?.id).filter(Boolean))]
const { data: reviews } = await supabase.from("reviews").select("*").in("reviewee_id", ownerIds)

// Realtime
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', table: 'messages' }, handleNew)
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])
```

### Styling
```typescript
// Tailwind with cn() helper
import { cn } from "@/lib/utils"
<button className={cn("base-classes", variant === "primary" && "variant-classes", className)}>

// CVA for variants
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { default: "...", sm: "..." }
  },
  defaultVariants: { variant: "default", size: "default" }
})
```

---

## Key Features

### Authentication (`/components/auth`)
- Email/Password + OAuth (Google, GitHub, Facebook, Twitter)
- Dual roles (renter/owner) in user metadata
- Multi-step registration: 3-step (renter), 4-step (owner)
- Modal-based flows (see `SIGNUP_MODAL_TRANSFORMATION_PLAN.md`)

**Key Files:** `AuthContext.tsx`, `LoginModal.tsx`, `SignupModal.tsx`, signup forms

### Equipment Management (`/components/equipment`)
- Listing cards with photo carousels, pricing, ratings
- Detail dialogs with tabbed interface
- CRUD operations with availability calendar
- Service layer: `equipment/services/listings.ts`
- N+1 prevention via batch queries

### Booking System (`/components/booking`)
- Request flow: Renter requests → Owner approves → Payment → Completion
- Real-time availability checking against `availability_calendar`
- Dynamic pricing calculator
- Status: Pending → Approved → Completed → Reviewed

**Workflow:**
1. Renter selects dates
2. System checks availability
3. Pricing calculated (daily_rate × days)
4. Booking request created (status: pending)
5. Owner approves/declines
6. If approved: Booking created, payment initiated
7. After completion: Review flow

### Messaging (`/components/messaging`)
- Real-time chat with Supabase Realtime subscriptions
- Typing indicators, online status (presence tracking)
- Unread counts via RPC function
- System messages for booking updates

**Tables:** `conversations`, `conversation_participants`, `messages`

### Payments (`/components/payment`, `/lib/stripe.ts`)
- Stripe Elements for card input
- Escrow system: funds held until completion
- Edge functions: `create-payment-intent`, `stripe-webhook`, `process-refund`

**Flow:** Booking approved → Payment intent → Stripe checkout → Webhook confirmation → Escrow hold → Completion → Release to owner

### Reviews & Ratings (`/components/reviews`)
- 1-5 star system with text comments
- Dual reviews: equipment + user reviews
- Aggregate stats calculations

### Verification (`/components/verification`)
- Document upload (ID verification via Supabase Storage)
- Phone verification, trust score
- Verification badges

### Location Services (`/features/location`)
- Geocoding (address ↔ coordinates)
- Google Places autocomplete
- Browser geolocation API
- Provider abstraction pattern

---

## Database Schema

**Statistics:** 21 profiles, 23 categories, 15 equipment listings, 2 bookings, 2 conversations, 26 migrations

### Core Tables Overview

| Table | Purpose | Key Fields | RLS |
|-------|---------|------------|-----|
| `profiles` | Base user info | email, role (enum), verification flags (booleans), timestamps | ✅ |
| `renter_profiles` | Renter-specific data | profile_id, preferences (JSONB), experience_level | ✅ |
| `owner_profiles` | Owner-specific data | profile_id, business_info (JSONB), earnings_total | ✅ |
| `categories` | Equipment categories | name, parent_id (self-ref), sport_type, attributes (JSONB) | ✅ |
| `equipment` | Listings | owner_id, category_id, title, daily_rate, condition (enum), location, lat/lng | ✅ |
| `equipment_photos` | Listing images | equipment_id, photo_url, is_primary, order_index | ✅ |
| `availability_calendar` | Date availability | equipment_id, date, is_available, custom_rate | ✅ |
| `booking_requests` | Rental requests | equipment_id, renter_id, dates, total_amount, status (enum) | ✅ |
| `bookings` | Confirmed bookings | booking_request_id (1:1), payment_status, pickup_method | ✅ |
| `reviews` | User reviews | booking_id, reviewer_id, reviewee_id, rating (1-5), comment | ✅ |
| `conversations` | Message threads | booking_request_id, participants (UUID[]) | ✅ |
| `conversation_participants` | Conversation members | conversation_id, profile_id, last_read_at | ✅ |
| `messages` | Chat messages | conversation_id, sender_id, content, message_type | ✅ |
| `payments` | Payment transactions | booking_request_id, stripe_payment_intent_id, amounts, escrow_status, payout_status | ✅ |
| `booking_history` | Audit trail | booking_request_id, status changes, changed_by, metadata | ✅ |
| `user_verifications` | Identity verification | user_id, verification_type, status, document_url | ✅ |

### Custom Enums
```sql
user_role: 'renter' | 'owner'
equipment_condition: 'new' | 'excellent' | 'good' | 'fair'
booking_status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
```

**Note:** Verification is tracked using boolean flags in the `profiles` table (`identity_verified`, `phone_verified`, `email_verified`, `address_verified`).

### Key Relationships
1. `auth.users` → `profiles` → `renter_profiles` OR `owner_profiles`
2. `profiles` (owner) → `equipment` → `equipment_photos` + `availability_calendar`
3. `booking_requests` → `bookings` (1:1) → `reviews`
4. `conversations` ↔ `conversation_participants` (M:N) → `messages`
5. `booking_requests` → `payments` (Stripe escrow)

### RLS Policies (58 total across 13 tables)
- **profiles**: Auth users view all, update own
- **equipment**: Anonymous view available, owners CRUD own
- **booking_requests**: Users view own requests OR requests for their equipment
- **payments**: Users view payments where they are renter OR owner
- **messages**: Users view/send only in their conversations

### Database Functions & Triggers
- **RPC**: `get_unread_messages_count(user_uuid)` - Returns unread count
- **Triggers**: Profile creation on signup, booking approval automation, cancellation handling, payment status sync

### Extensions
- Core: `uuid-ossp`, `pgcrypto`, `postgis`
- Supabase: `supabase_vault`, `pg_graphql`
- Performance: `pg_stat_statements`, `hypopg`, `index_advisor`

### Storage Buckets
- `equipment-photos` (public) - Listing images
- `verification-documents` (private) - ID uploads

### Type Generation
```bash
# Via MCP
mcp__supabase__generate_typescript_types()

# Via CLI
npx supabase gen types typescript --project-id ID > src/lib/database.types.ts
```

**⚠️ Always regenerate types after schema changes**

---

## Development Workflow

### Environment Variables
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_STRIPE_PUBLISHABLE_KEY=your_key
VITE_GOOGLE_MAPS_API_KEY=your_key  # Optional
```

### Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server at localhost:5173 |
| `npm run build` | Production build to /dist |
| `npm run test` | Run tests once |
| `npm run test:watch` | Tests in watch mode |

### Git Workflow
**Branches:**
- Features: `feature/feature-name`
- Fixes: `fix/bug-description`
- Docs: `docs/update-name`
- Claude: `claude/session-id`

**Commits:** Follow conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)

**Flow:** Branch → Changes → Tests → TypeScript check → Commit → Push → PR

### Code Quality
```bash
npx tsc --noEmit        # Type check
npx eslint .            # Lint
npx eslint . --fix      # Auto-fix
```

---

## Important Considerations

### Critical Rules
1. **Always use path aliases** (`@/`) not relative imports
2. **Type safety**: Define types for props, functions, state
3. **Extract types from Database** for Supabase tables
4. **Check Supabase errors**: Always handle `error` in responses
5. **RLS policies**: Never bypass, use for authorization
6. **Prevent N+1 queries**: Batch fetch related data
7. **Use React Query** for server state caching
8. **Validate input**: Client AND server (Zod schemas)
9. **Regenerate database types** after schema changes
10. **Test before committing**: Types, linting, tests

### Common Pitfalls
- ❌ Barrel exports (`index.ts`) - Import directly
- ❌ Relative imports - Use `@/` alias
- ❌ Ignoring Supabase errors
- ❌ Skipping validation
- ❌ Creating new state management unnecessarily
- ❌ Hardcoding config - Use env vars
- ❌ Committing secrets
- ❌ Breaking RLS policies

### Quick Reference
**Need to...**
- Auth logic → `src/contexts/AuthContext.tsx`, `src/components/auth/`
- Fetch listings → `src/components/equipment/services/listings.ts`
- UI component → `src/components/ui/`
- Custom hook → `src/hooks/`
- Utility → `src/lib/utils.ts`
- Types → `src/types/` or extract from `database.types.ts`
- New page → `src/pages/` + route in `App.tsx`
- Database changes → `supabase/migrations/`
- Payment logic → `src/lib/stripe.ts`, `src/components/payment/`
- Messaging → `src/components/messaging/`, `src/hooks/useMessaging.ts`

### Testing
- **Vitest** with jsdom environment
- Component tests with React Testing Library
- Hook tests with `renderHook`
- See `README.md` for manual testing checklist

---

## Resources

**Internal:**
- `README.md` - Setup and usage
- `SIGNUP_MODAL_TRANSFORMATION_PLAN.md` - Auth modal architecture
- `supabase/guides/` - RLS, Realtime, Edge Functions

**External:**
- [React](https://react.dev), [TypeScript](https://typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs), [Shadcn UI](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs), [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev), [TanStack Query](https://tanstack.com/query/latest)

---

**Last Updated:** 2025-11-15
