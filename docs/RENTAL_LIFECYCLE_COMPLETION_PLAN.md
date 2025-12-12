# Rental Lifecycle Completion Plan

> **Document Created:** December 3, 2024  
> **Status:** Planning  
> **Priority:** High

---

## 📊 Executive Summary

This document outlines the plan to complete the rental lifecycle UI/UX flow in Rentaloo. Currently, there are significant gaps after a user completes a pickup inspection, leaving the rental in an ambiguous state with no clear path to completion.

### Current Problem
After a renter completes the pickup inspection, there is:
- ❌ No pickup confirmation to officially start the rental
- ❌ No dedicated "Active Rental" view during the rental period
- ❌ No return confirmation to finalize the rental
- ❌ No review prompt after completion
- ❌ No automatic deposit release trigger

---

## 📈 Current State Analysis

### Existing Flow
```
[Payment Success] → [Booking Created as "approved"] → [Pickup Inspection] → ??? → [Return Inspection] → ???
```

> **Note:** Bookings are created directly with `approved` status after successful Stripe payment (via webhook). 
> There is no `pending` state in production - payment is required upfront before booking creation.

### What's Currently Working
| Feature | Status | Location |
|---------|--------|----------|
| Payment flow (Stripe) | ✅ Complete | `PaymentForm.tsx`, `PaymentCheckoutForm.tsx` |
| Pickup inspection wizard | ✅ Complete | `InspectionWizard.tsx`, `EquipmentInspectionPage.tsx` |
| Return inspection wizard | ✅ Complete | Same as above with `type="return"` |
| Booking lifecycle stepper | ✅ Complete | `BookingLifecycleStepper.tsx` |
| Review components | ✅ Complete | `ReviewForm.tsx`, `ReviewList.tsx` |
| Deposit/escrow tracking | ✅ Complete | `payments` table, `EscrowDashboard.tsx` |

### Identified Gaps

| Gap ID | Description | User Impact | Business Impact |
|--------|-------------|-------------|-----------------|
| **GAP-1** | No pickup confirmation after inspection | User doesn't know rental is officially active | Confusion, support tickets |
| **GAP-2** | No "Active Rental" state/page | No dedicated view during rental period | Poor UX, no engagement |
| **GAP-3** | No return confirmation & completion | Rental never truly "completes" | Data integrity issues |
| **GAP-4** | Review not prompted after return | Lost opportunity for feedback | No social proof, no quality signal |
| **GAP-5** | Deposit release not triggered | Money stuck in escrow | Financial issues, disputes |

---

## 🎯 Proposed Solution

### Target Flow
```
[Payment Success] → [Booking Created as "approved"] → [Pickup Inspection] 
    → [Pickup Confirmation] → [Active Rental] → [Return Inspection] 
    → [Return Confirmation] → [Review + Deposit Release] → [Completed]
```

### Booking Status Flow
```
approved → active → completed
        ↘ cancelled ↙
```

> **Important:** The `pending` status is NOT used in the production flow. 
> Stripe webhook creates bookings directly as `approved` after successful payment.

---

## 📋 Implementation Phases

### Phase 1: Pickup Confirmation Flow
**Goal:** After pickup inspection, confirm both parties acknowledge the handover

#### New Components

##### 1. `PickupConfirmationStep.tsx`
- **Location:** `src/components/inspection/steps/PickupConfirmationStep.tsx`
- **Purpose:** Final step in InspectionWizard for pickup type
- **Features:**
  - Shows inspection summary (photos count, checklist status, timestamp)
  - Displays rental period information
  - "Start My Rental" primary CTA button
  - Updates booking status from `approved` to `active`
  - Sends system message to conversation

#### Database Changes
```sql
-- Add 'active' to booking_status enum
ALTER TYPE booking_status ADD VALUE 'active' AFTER 'approved';
```

#### Files to Modify
| File | Changes |
|------|---------|
| `src/components/inspection/InspectionWizard.tsx` | Add confirmation step after review step |
| `src/lib/database.types.ts` | Add `active` to BookingStatus type |
| `src/lib/booking.ts` | Add status color/text for `active` |
| `supabase/migrations/` | New migration file |

#### Acceptance Criteria
- [ ] After pickup inspection submission, user sees confirmation screen
- [ ] "Start My Rental" button updates status to `active`
- [ ] Booking card shows "Active" badge
- [ ] System message sent to conversation when rental starts

---

### Phase 2: Active Rental Page
**Goal:** Dedicated view showing current rental status with key actions

#### New Components

##### 1. `ActiveRentalPage.tsx`
- **Location:** `src/pages/rental/ActiveRentalPage.tsx`
- **Route:** `/rental/:bookingId`
- **Features:**
  - Equipment details card with image
  - Rental countdown timer (days/hours remaining)
  - Progress bar showing rental completion percentage
  - Quick action buttons (Message, View Inspection, Directions, Help)
  - Return reminder banner (appears 24-48 hours before end)
  - Emergency contact information
  - "Start Return Inspection" CTA

##### 2. `ActiveRentalCard.tsx`
- **Location:** `src/components/rental/ActiveRentalCard.tsx`
- **Purpose:** Compact card for dashboard showing active rentals
- **Features:**
  - Equipment thumbnail and title
  - Time remaining indicator
  - Progress bar
  - "View Rental" button

##### 3. `RentalCountdown.tsx`
- **Location:** `src/components/rental/RentalCountdown.tsx`
- **Purpose:** Reusable countdown timer component
- **Features:**
  - Days, hours, minutes display
  - Visual progress bar
  - Urgency styling (green → yellow → red)

##### 4. `RentalQuickActions.tsx`
- **Location:** `src/components/rental/RentalQuickActions.tsx`
- **Purpose:** Action button grid for active rental
- **Actions:**
  - Message Owner/Renter
  - View Pickup Inspection
  - Get Directions
  - Contact Support

#### Files to Create
```
src/
├── components/
│   └── rental/
│       ├── ActiveRentalCard.tsx
│       ├── RentalCountdown.tsx
│       ├── RentalQuickActions.tsx
│       └── RentalProgressBar.tsx
├── pages/
│   └── rental/
│       └── ActiveRentalPage.tsx
└── types/
    └── rental.ts
```

> **Note:** No barrel export (`index.ts`) per project conventions. Import components directly.

#### Files to Modify
| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/rental/:bookingId` |
| `src/pages/renter/RenterDashboard.tsx` | Add ActiveRentalCard section |
| `src/components/booking/BookingRequestCard.tsx` | Add "View Active Rental" link |

#### Acceptance Criteria
- [ ] Active rental page accessible via `/rental/:bookingId`
- [ ] Countdown timer updates in real-time
- [ ] Quick actions all functional
- [ ] Dashboard shows active rentals prominently
- [ ] Return reminder appears when appropriate

---

### Phase 3: Return Confirmation & Completion
**Goal:** Finalize the rental after return inspection

#### New Components

##### 1. `ReturnConfirmationStep.tsx`
- **Location:** `src/components/inspection/steps/ReturnConfirmationStep.tsx`
- **Purpose:** Final step after return inspection
- **Features:**
  - Side-by-side comparison: pickup vs return condition
  - Damage assessment summary (if any differences)
  - "Complete Rental" primary CTA
  - "Complete & Leave Review" secondary CTA
  - Updates status from `active` to `completed`

##### 2. `RentalCompletionModal.tsx`
- **Location:** `src/components/rental/RentalCompletionModal.tsx`
- **Purpose:** Post-completion celebration/next steps modal
- **Features:**
  - Success message and animation
  - Deposit release status and timeline
  - Review prompt
  - "Rent Again" CTA
  - Share experience option

#### Files to Modify
| File | Changes |
|------|---------|
| `src/components/inspection/InspectionWizard.tsx` | Add return confirmation step |
| `src/lib/booking.ts` | Add completion handler |

#### Acceptance Criteria
- [ ] Return inspection ends with confirmation step
- [ ] Condition comparison shown if both inspections exist
- [ ] Status updates to `completed` on confirmation
- [ ] Completion modal displays with next steps
- [ ] System message sent to conversation when rental completes

---

### Phase 4: Review Integration
**Goal:** Seamlessly prompt for reviews after completion

#### New Components

##### 1. `PostRentalReviewFlow.tsx`
- **Location:** `src/components/reviews/PostRentalReviewFlow.tsx`
- **Purpose:** Integrated review flow after rental completion
- **Features:**
  - Star rating (required)
  - Comment textarea
  - Photo upload option
  - Category tags (equipment quality, communication, accuracy)
  - "Skip for now" option
  - Progress indicator for mutual reviews

##### 2. `ReviewPromptBanner.tsx`
- **Location:** `src/components/reviews/ReviewPromptBanner.tsx`
- **Purpose:** Reminder banner for pending reviews
- **Features:**
  - Shows on dashboard when reviews are pending
  - Equipment thumbnail preview
  - "Leave a Review" CTA
  - Dismiss option (reminds later)

##### 3. `MutualReviewCard.tsx`
- **Location:** `src/components/reviews/MutualReviewCard.tsx`
- **Purpose:** Show mutual review status with reveal logic
- **Features:**
  - Your review status (submitted or pending)
  - Other party's review status (hidden until BOTH submit)
  - Unlock reveal animation after both complete
  - "Waiting for other party" state when you've submitted but they haven't
- **Mutual Reveal Logic:**
  - Reviews are stored immediately but `is_revealed` flag starts as `false`
  - When both `renter_reviewed_at` AND `owner_reviewed_at` are set, trigger reveal
  - Database trigger or application logic updates `is_revealed = true` for both reviews

#### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/renter/RenterDashboard.tsx` | Add review prompt section |
| `src/pages/owner/OwnerDashboard.tsx` | Add review prompt section |
| `src/components/reviews/ReviewForm.tsx` | Enhance for inline modal use |

#### Database Changes
```sql
-- Add review tracking and mutual reveal support
ALTER TABLE booking_requests 
ADD COLUMN renter_review_prompted_at TIMESTAMPTZ,
ADD COLUMN owner_review_prompted_at TIMESTAMPTZ;

-- Add reveal flag to reviews table for mutual reveal feature
ALTER TABLE reviews
ADD COLUMN is_revealed BOOLEAN DEFAULT false;

-- Trigger to auto-reveal reviews when both parties have submitted
CREATE OR REPLACE FUNCTION reveal_mutual_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if both parties have reviewed
  IF EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.id = NEW.booking_id
    AND br.renter_reviewed_at IS NOT NULL
    AND br.owner_reviewed_at IS NOT NULL
  ) THEN
    -- Reveal all reviews for this booking
    UPDATE reviews 
    SET is_revealed = true 
    WHERE booking_id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reveal_mutual_reviews
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION reveal_mutual_reviews();
```

#### Acceptance Criteria
- [ ] Review flow appears after rental completion
- [ ] Reviews can be skipped but reminder appears
- [ ] Both parties can review each other
- [ ] Dashboard shows pending review banner
- [ ] Reviews linked to correct booking

---

### Phase 5: Deposit Release Flow
**Goal:** Automatic deposit release after successful return

#### New Components

##### 1. `DepositReleaseConfirmation.tsx`
- **Location:** `src/components/payment/DepositReleaseConfirmation.tsx`
- **Purpose:** Show deposit status and release timeline
- **Features:**
  - Current deposit amount
  - Release timeline (e.g., "Released in 48 hours")
  - Claim window notice
  - Status updates (held → releasing → released)

##### 2. `DepositReleaseTimeline.tsx`
- **Location:** `src/components/payment/DepositReleaseTimeline.tsx`
- **Purpose:** Visual timeline of deposit lifecycle
- **Features:**
  - Held at booking
  - Claim window period
  - Release date
  - Final status

#### Backend Logic
```sql
-- Function to auto-release deposits
CREATE OR REPLACE FUNCTION auto_release_deposits()
RETURNS void AS $$
BEGIN
  UPDATE payments
  SET 
    deposit_status = 'released',
    deposit_released_at = NOW()
  WHERE 
    deposit_status = 'held'
    AND booking_request_id IN (
      SELECT id FROM booking_requests 
      WHERE status = 'completed'
      AND updated_at < NOW() - INTERVAL '48 hours'
    )
    AND NOT EXISTS (
      SELECT 1 FROM damage_claims 
      WHERE booking_id = payments.booking_request_id
      AND status NOT IN ('resolved', 'rejected')
    );
END;
$$ LANGUAGE plpgsql;

-- Scheduled job (via pg_cron or external scheduler)
-- Runs every hour
SELECT cron.schedule('auto-release-deposits', '0 * * * *', 'SELECT auto_release_deposits()');
```

#### Files to Modify
| File | Changes |
|------|---------|
| `src/components/payment/EscrowStatus.tsx` | Add post-rental release status |
| `src/lib/deposit.ts` | Add release status helpers |
| `src/pages/renter/PaymentsPage.tsx` | Show deposit release info |

#### Acceptance Criteria
- [ ] Deposit status shown after rental completion
- [ ] Release timeline clearly communicated (48 hour claim window)
- [ ] Auto-release occurs after 48 hour claim window
- [ ] Release blocked if damage claim exists
- [ ] System message sent to conversation on release

---

## 📁 Complete File Structure

```
src/
├── components/
│   ├── rental/                              # NEW DIRECTORY
│   │   ├── ActiveRentalCard.tsx             # Dashboard card
│   │   ├── RentalCountdown.tsx              # Countdown timer
│   │   ├── RentalQuickActions.tsx           # Action buttons
│   │   ├── RentalProgressBar.tsx            # Progress indicator
│   │   └── RentalCompletionModal.tsx        # Completion celebration
│   │   # NO index.ts - import directly per project conventions
│   │
│   ├── inspection/
│   │   ├── steps/
│   │   │   ├── PickupConfirmationStep.tsx   # NEW - Post-pickup
│   │   │   ├── ReturnConfirmationStep.tsx   # NEW - Post-return
│   │   │   └── ... (existing steps)
│   │   └── ...
│   │
│   ├── reviews/
│   │   ├── PostRentalReviewFlow.tsx         # NEW - Integrated flow
│   │   ├── ReviewPromptBanner.tsx           # NEW - Dashboard reminder
│   │   ├── MutualReviewCard.tsx             # NEW - Dual review status
│   │   └── ... (existing)
│   │
│   └── payment/
│       ├── DepositReleaseConfirmation.tsx   # NEW - Release status
│       ├── DepositReleaseTimeline.tsx       # NEW - Visual timeline
│       └── ... (existing)
│
├── pages/
│   ├── rental/                              # NEW DIRECTORY
│   │   └── ActiveRentalPage.tsx             # Active rental view
│   └── ...
│
├── types/
│   ├── rental.ts                            # NEW - Rental types
│   └── ...
│
└── hooks/
    └── useActiveRental.ts                   # NEW - Active rental hook
```

---

## 🗄️ Database Schema Changes

### 1. Update `booking_status` Enum
```sql
-- Migration: add_active_booking_status.sql
ALTER TYPE booking_status ADD VALUE 'active' AFTER 'approved';
```

### 2. New Table: `rental_events` (Audit Trail)
```sql
-- Migration: create_rental_events_table.sql
CREATE TABLE rental_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'pickup_confirmed',
    'rental_started', 
    'return_confirmed',
    'rental_completed',
    'review_submitted',
    'deposit_released'
  )),
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for fast lookups
CREATE INDEX idx_rental_events_booking ON rental_events(booking_id);
CREATE INDEX idx_rental_events_type ON rental_events(event_type);
```

### 3. Add Review Tracking Columns
```sql
-- Migration: add_review_tracking.sql
ALTER TABLE booking_requests 
ADD COLUMN renter_reviewed_at TIMESTAMPTZ,
ADD COLUMN owner_reviewed_at TIMESTAMPTZ,
ADD COLUMN completed_at TIMESTAMPTZ;
```

---

## 🎨 UI/UX Mockups

### 1. Pickup Confirmation Screen
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✅ Pickup Inspection Complete!                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  📷 4 photos documented                           │  │
│  │  ✓ All 8 checklist items verified                │  │
│  │  📍 Location: 37.7749° N, 122.4194° W            │  │
│  │  ⏱ Timestamp: Dec 3, 2024 at 10:30 AM           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  📅 Your Rental Period                           │  │
│  │  Dec 3 - Dec 7, 2024 (4 days)                    │  │
│  │  Return by: Dec 7, 2024 at 5:00 PM              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  The equipment is now in your care. Please return it    │
│  in the same condition.                                 │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              🎿 Start My Rental                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Active Rental Page (Mobile)
```
┌─────────────────────────────────────────────────────────┐
│  ← Back                              ⋮                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [═══════════ Equipment Image ════════════════]  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  🎿 Mountain Ski Set Pro                                │
│  Currently renting from John D.                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  ⏱ Time Remaining                                │  │
│  │                                                   │  │
│  │       3 days, 14 hours                           │  │
│  │                                                   │  │
│  │  ████████████████░░░░░░░░░░░░░░░  62%            │  │
│  │                                                   │  │
│  │  Return by: Dec 7, 2024 at 5:00 PM              │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Quick Actions                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │    💬    │ │    📋    │ │    📍    │ │    ❓    │   │
│  │ Message  │ │  View    │ │Directions│ │   Help   │   │
│  │  Owner   │ │Inspection│ │          │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ⚠️ Return Reminder                              │  │
│  │  Your rental ends in less than 24 hours.         │  │
│  │  Please prepare to return the equipment.         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │           🔙 Start Return Inspection              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Return Confirmation & Review Flow
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🎉 Rental Complete!                                    │
│                                                         │
│  The equipment has been successfully returned.          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Condition Comparison                             │  │
│  │  ┌─────────────┐    ┌─────────────┐              │  │
│  │  │   Pickup    │ → │   Return    │              │  │
│  │  │  ✓ Good     │    │  ✓ Good     │              │  │
│  │  └─────────────┘    └─────────────┘              │  │
│  │  ✅ No damage detected                           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  💰 Deposit Status                                │  │
│  │                                                   │  │
│  │  $150.00 deposit held                            │  │
│  │                                                   │  │
│  │  ⏱ Will be released in 48 hours                  │  │
│  │  (unless a damage claim is filed by the owner)   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ⭐ How was your experience?                      │  │
│  │                                                   │  │
│  │  Rate your rental:                               │  │
│  │  ☆ ☆ ☆ ☆ ☆                                      │  │
│  │                                                   │  │
│  │  ┌───────────────────────────────────────────┐   │  │
│  │  │ Share your experience...                  │   │  │
│  │  │                                           │   │  │
│  │  └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │  Skip for now   │  │     Submit Review           │   │
│  └─────────────────┘  └─────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4. Dashboard with Pending Review Banner
```
┌─────────────────────────────────────────────────────────┐
│  🏠 My Dashboard                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ⭐ You have a pending review                     │  │
│  │                                                   │  │
│  │  ┌─────┐  Mountain Ski Set                       │  │
│  │  │ 📷  │  Rented Dec 3-7, 2024                   │  │
│  │  └─────┘                                         │  │
│  │                                                   │  │
│  │  [Leave a Review]              [Remind me later] │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ... rest of dashboard ...                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📅 Implementation Timeline

### Sprint 1 (Week 1-2): Core Flow
| Task | Estimate | Priority |
|------|----------|----------|
| Database migration for `active` status | 2 hrs | 🔴 Critical |
| `PickupConfirmationStep.tsx` | 6 hrs | 🔴 Critical |
| `ReturnConfirmationStep.tsx` | 6 hrs | 🔴 Critical |
| Update `InspectionWizard.tsx` | 4 hrs | 🔴 Critical |
| Update booking status helpers | 2 hrs | 🔴 Critical |

### Sprint 2 (Week 2-3): Active Rental
| Task | Estimate | Priority |
|------|----------|----------|
| `ActiveRentalPage.tsx` | 8 hrs | 🟡 High |
| `ActiveRentalCard.tsx` | 4 hrs | 🟡 High |
| `RentalCountdown.tsx` | 3 hrs | 🟡 High |
| `RentalQuickActions.tsx` | 3 hrs | 🟡 High |
| Dashboard integration | 4 hrs | 🟡 High |
| Routing setup | 2 hrs | 🟡 High |

### Sprint 3 (Week 3-4): Reviews & Deposits
| Task | Estimate | Priority |
|------|----------|----------|
| `PostRentalReviewFlow.tsx` | 6 hrs | 🟡 High |
| `ReviewPromptBanner.tsx` | 3 hrs | 🟡 High |
| `MutualReviewCard.tsx` + reveal logic | 4 hrs | 🟡 High |
| `DepositReleaseConfirmation.tsx` | 4 hrs | 🟢 Medium |
| Auto-release backend logic | 6 hrs | 🟢 Medium |

> **Note:** Push notifications are out of scope for this phase. System messages in conversation threads will be used instead.

### Sprint 4 (Week 4-5): Polish & Testing
| Task | Estimate | Priority |
|------|----------|----------|
| E2E testing | 8 hrs | 🔴 Critical |
| Mobile responsiveness | 6 hrs | 🟡 High |
| Error handling | 4 hrs | 🟡 High |
| Performance optimization | 4 hrs | 🟢 Medium |
| Documentation | 4 hrs | 🟢 Medium |

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] `PickupConfirmationStep` renders correctly
- [ ] `ReturnConfirmationStep` shows comparison when both inspections exist
- [ ] `RentalCountdown` calculates time correctly
- [ ] Status transitions work (`approved` → `active` → `completed`)
- [ ] Mutual reveal logic triggers correctly when both parties review

### Integration Tests
- [ ] Complete pickup flow end-to-end
- [ ] Complete return flow end-to-end
- [ ] Review submission flow
- [ ] Deposit release after timeout

### E2E Tests
- [ ] Full rental lifecycle (payment → pickup → active → return → complete)
- [ ] Cancel during active rental
- [ ] Damage claim blocks deposit release
- [ ] Review prompts appear on dashboard

---

## 📊 Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Rental completion rate | Unknown | 95% | % of approved bookings reaching completed |
| Review submission rate | Unknown | 60% | % of completed rentals with reviews |
| Deposit release time | Manual | < 48 hrs | Avg time from completion to release |
| Support tickets (rental issues) | Baseline | -50% | Monthly ticket count |
| User satisfaction | Baseline | +20% | Post-rental survey |

---

## 🔗 Related Documentation

- [Inspection Flow Documentation](./inspection-flow.md) *(if exists)*
- [Payment Integration Guide](./payment-integration.md) *(if exists)*
- [Database Schema](../supabase/README.md) *(if exists)*

---

## 📝 Decisions (Previously Open Questions)

| Question | Decision | Impact |
|----------|----------|--------|
| **Claim Window Duration** | **48 hours** | Auto-release deposits 48 hours after rental completion |
| **Review Visibility** | **Yes, mutual reveal** | Reviews hidden until both parties submit; requires `is_revealed` flag |
| **Active Rental Notifications** | **Out of scope** | No push notifications for now; use system messages in conversation |
| **Extension Handling** | **Deferred** | Not available in v1; will implement in future iteration |

### Scope Exclusions (for this phase)
- ❌ Push notifications (use conversation system messages instead)
- ❌ Rental extensions
- ❌ `pending` booking status (payment-first model means bookings start as `approved`)

---

## ✅ Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | ⏳ Pending |
| Tech Lead | | | ⏳ Pending |
| Design | | | ⏳ Pending |

---

*This document is a living document and will be updated as implementation progresses.*
