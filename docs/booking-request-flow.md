# Booking Request Flow

## Overview

The RentAloo platform uses a comprehensive booking request flow that ensures secure transactions between equipment owners and renters. The flow includes request creation, payment processing with escrow, booking confirmation, and completion with reviews.

## High-Level Flow Diagram

```
┌─────────────┐
│   RENTER    │
│  (Browse)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. EQUIPMENT DISCOVERY                                          │
│    - Browse equipment listings (ExplorePage)                    │
│    - Filter by category, location, price                        │
│    - View equipment details                                     │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. BOOKING REQUEST CREATION                                     │
│    Component: BookingRequestForm                                │
│    - Select start and end dates                                 │
│    - View pricing calculation (daily rate × days + 5% fee)      │
│    - Check availability (via checkBookingConflicts)             │
│    - Add optional message to owner                              │
│    - Submit request → Creates booking_request (status: pending) │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. PAYMENT PROCESSING                                           │
│    Component: PaymentForm (Stripe Integration)                  │
│    - Create Stripe Payment Intent via webhook                   │
│    - Renter enters payment details                              │
│    - Payment confirmed with Stripe                              │
│    - Webhook creates payment record (payment_status: succeeded) │
│    - Funds held in escrow (escrow_status: held)                 │
│    - Booking request updated (status: approved)                 │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ├──────────────────────────────────────────────────────────┐
       │                                                           │
       ▼                                                           ▼
┌─────────────┐                                            ┌─────────────┐
│   RENTER    │                                            │    OWNER    │
│  Dashboard  │                                            │  Dashboard  │
└──────┬──────┘                                            └──────┬──────┘
       │                                                           │
       │◄──────────────────────────────────────────────────────────┤
       │           Optional: Messaging Between Parties             │
       │                (MessagingInterface)                       │
       │                                                           │
       ▼                                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. RENTAL PERIOD                                                │
│    - Equipment pickup/delivery                                  │
│    - Usage during rental period                                 │
│    - Equipment return                                           │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. BOOKING COMPLETION                                           │
│    - Webhook marks booking as completed                         │
│    - Escrow funds released to owner (escrow_status: released)   │
│    - Owner receives payout                                      │
│    - Booking request updated (status: completed)                │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. REVIEWS & FEEDBACK                                           │
│    Component: ReviewList                                        │
│    - Both parties can leave reviews                             │
│    - Star ratings (1-5)                                         │
│    - Written feedback                                           │
│    - Reviews visible on profiles and equipment listings         │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed State Flow

### Booking Request States

```
    ┌──────────┐
    │ PENDING  │ ◄──── Initial state after request creation
    └────┬─────┘
         │
         ├─────► Payment Processing
         │
         ▼
    ┌──────────┐
    │ APPROVED │ ◄──── Payment successful, funds in escrow
    └────┬─────┘
         │
         ├─────► Rental Period Active
         │
         │       Alternative flows:
         ├─────► CANCELLED (by renter or owner, refund issued)
         │
         ▼
    ┌──────────┐
    │COMPLETED │ ◄──── Rental finished, escrow released
    └──────────┘
```

## Key Actors

### 1. Renter
- **Responsibilities:**
  - Browse and search for equipment
  - Create booking requests
  - Submit payment
  - Communicate with owner
  - Return equipment
  - Leave reviews

### 2. Owner
- **Responsibilities:**
  - List equipment with availability and pricing
  - Manage availability calendar
  - Communicate with renter
  - Confirm equipment pickup/return
  - Receive payouts
  - Leave reviews

### 3. System (Automated)
- **Responsibilities:**
  - Process payments via Stripe webhooks
  - Manage escrow funds
  - Update booking statuses
  - Send notifications
  - Track transaction history
  - Enforce business rules

## Database Schema

### Core Tables

#### booking_requests
```sql
- id: UUID (primary key)
- equipment_id: UUID (foreign key → equipment)
- renter_id: UUID (foreign key → profiles)
- start_date: DATE
- end_date: DATE
- total_amount: DECIMAL(10,2)
- status: booking_status (pending | approved | cancelled | completed)
- message: TEXT (optional message to owner)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### payments
```sql
- id: UUID (primary key)
- booking_request_id: UUID (foreign key → booking_requests)
- renter_id: UUID
- owner_id: UUID
- subtotal: DECIMAL(10,2)
- service_fee: DECIMAL(10,2)
- tax: DECIMAL(10,2)
- total_amount: DECIMAL(10,2)
- escrow_amount: DECIMAL(10,2)
- owner_payout_amount: DECIMAL(10,2)
- payment_status: payment_status (pending | succeeded | failed | refunded)
- escrow_status: escrow_status (held | released | refunded)
- stripe_payment_intent_id: TEXT
- payment_method_id: TEXT
- currency: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### equipment
```sql
- id: UUID
- owner_id: UUID (foreign key → profiles)
- title: TEXT
- description: TEXT
- daily_rate: DECIMAL(10,2)
- location: TEXT
- condition: TEXT
- category_id: UUID (foreign key → categories)
- ... (additional fields)
```

## Key Components

### Frontend Components

#### 1. BookingRequestForm
**Location:** `src/components/booking/BookingRequestForm.tsx`

**Purpose:** Handles the initial booking request creation

**Features:**
- Date range selection with validation
- Real-time pricing calculation
- Availability conflict checking using `checkBookingConflicts()`
- Rental period validation (1-30 days)
- Message to owner
- Prevents self-booking

**Key Functions:**
```typescript
// Calculate total cost with service fees
calculateBookingTotal(dailyRate, startDate, endDate)

// Check for booking conflicts using database function
checkBookingConflicts(equipmentId, startDate, endDate)

// Format dates for display
formatBookingDate(date)
formatBookingDuration(startDate, endDate)
```

#### 2. PaymentForm
**Location:** `src/components/payment/PaymentForm.tsx`

**Purpose:** Handles secure payment processing with Stripe

**Features:**
- Stripe Payment Element integration
- Payment intent creation via webhook
- Real-time payment status
- Escrow fund management
- Payment summary display

**Payment Flow:**
1. Create Payment Intent (Stripe webhook)
2. Collect payment details
3. Confirm payment with Stripe
4. Webhook creates payment record
5. Update booking request to 'approved'
6. Funds held in escrow

#### 3. BookingRequestCard
**Location:** `src/components/booking/BookingRequestCard.tsx`

**Purpose:** Display and manage individual booking requests

**Features:**
- Real-time status updates (via Supabase subscriptions)
- Cancellation handling
- Payment status tracking
- Messaging integration
- Status badges and visual indicators

**Status Updates:**
```typescript
// Subscribe to real-time payment updates
supabase
  .channel(`payment-${bookingRequestId}`)
  .on('postgres_changes', ...)

// Subscribe to booking status updates
supabase
  .channel(`booking-${bookingRequestId}`)
  .on('postgres_changes', ...)
```

### Backend Functions

#### 1. checkBookingConflicts (Database Function)
**Location:** `src/lib/booking.ts` + SQL function

**Purpose:** Efficiently check for date conflicts using database indexes

**Features:**
- Validates minimum rental period (1 day)
- Validates maximum rental period (30 days)
- Checks for overlapping bookings
- Leverages `idx_booking_requests_conflict_check` index
- Returns conflict information

#### 2. calculatePaymentSummary
**Location:** `src/lib/payment.ts`

**Purpose:** Calculate payment breakdown

**Calculations:**
```typescript
subtotal = daily_rate × rental_days
service_fee = subtotal × 0.05 (5%)
tax = subtotal × tax_rate
total = subtotal + service_fee + tax
escrow_amount = total
owner_payout = subtotal - platform_commission
```

## Hooks & State Management

### useBookingRequests
**Location:** `src/hooks/useBookingRequests.ts`

**Purpose:** Manage booking request data fetching and state

**Features:**
- Fetch bookings for renters or owners
- Filter by status
- Real-time updates
- Error handling
- Loading states

### usePayment
**Location:** `src/hooks/usePayment.ts`

**Purpose:** Handle payment operations

**Features:**
- Create payments with escrow
- Process refunds
- Release escrow funds
- Track payment status

## Business Rules

### Booking Validation Rules
1. **Date Validation:**
   - End date must be after start date
   - Minimum rental period: 1 day
   - Maximum rental period: 30 days
   - Start date cannot be in the past

2. **Availability:**
   - No overlapping bookings for same equipment
   - Respects owner's custom availability calendar
   - Real-time conflict checking

3. **Authorization:**
   - Renters cannot book their own equipment
   - Must be authenticated to create bookings
   - RLS policies enforce data access control

### Payment Rules
1. **Service Fee:** 5% of subtotal
2. **Escrow:** 100% of payment held in escrow until completion
3. **Refunds:** Full refund if cancelled before rental period
4. **Payout:** Released to owner after successful completion

## Notification Points

### Real-time Updates
The system uses Supabase Realtime to provide instant updates:

1. **New Booking Request:** Owner notified
2. **Payment Received:** Renter and owner notified
3. **Booking Approved:** Renter notified
4. **Booking Cancelled:** Both parties notified
5. **Booking Completed:** Both parties notified
6. **Escrow Released:** Owner notified
7. **Review Submitted:** Reviewed party notified

## Error Handling

### Common Error Scenarios

1. **Payment Failures:**
   - Card declined → User prompted to try another payment method
   - Payment webhook failure → Admin notified for manual intervention

2. **Booking Conflicts:**
   - Race conditions → Database function ensures atomicity
   - Conflicting dates → User shown error and alternative dates

3. **Cancellations:**
   - Owner cancels → Full refund processed automatically
   - Renter cancels → Refund based on cancellation policy

## Performance Optimizations

### Database Indexes
The system uses optimized indexes for common queries:

```sql
-- Equipment and status queries (owner dashboard)
idx_booking_requests_equipment_status_created

-- Renter queries
idx_booking_requests_renter_status_created

-- Conflict checking
idx_booking_requests_conflict_check

-- Date ordering
idx_booking_requests_created_at_desc
```

### Query Patterns
- Use of database functions for complex conflict checking
- Composite indexes for multi-column queries
- Pagination for large datasets
- Real-time subscriptions instead of polling

## Security Considerations

### Row Level Security (RLS)
All tables have RLS policies to ensure:
- Users can only view their own bookings
- Owners can view bookings for their equipment
- System operations use service role

### Payment Security
- Stripe PCI-compliant payment handling
- No credit card data stored in database
- Webhook signature verification
- Escrow system protects both parties

## Testing Considerations

### Manual Testing Checklist
- [ ] Create booking request with valid dates
- [ ] Verify pricing calculation accuracy
- [ ] Test conflict detection with overlapping dates
- [ ] Complete payment flow end-to-end
- [ ] Verify escrow hold
- [ ] Test cancellation and refund
- [ ] Verify completion and escrow release
- [ ] Test review submission

### Edge Cases
- Self-booking attempts
- Expired payment intents
- Webhook delivery failures
- Concurrent booking attempts for same dates
- Network failures during payment
- Browser refresh during payment process

## Future Enhancements

### Potential Improvements
1. **Dynamic Pricing:** Surge pricing based on demand
2. **Instant Booking:** Skip approval step for verified users
3. **Partial Payments:** Deposit + balance payment
4. **Insurance Options:** Optional damage coverage
5. **Flexible Cancellation:** Variable refund policies
6. **Multi-day Discounts:** Lower daily rates for longer rentals
7. **Booking Calendar:** Visual availability calendar
8. **Smart Notifications:** SMS/email notifications
9. **Auto-completion:** Automatic completion after return date
10. **Dispute Resolution:** Built-in dispute handling

## Related Documentation
- [Equipment Detail UI Implementation](./equipment-detail-ui-option-a-implementation.md)
- [Stripe Payment Implementation](./payments/stripe-test-payment-implementation.md)
- [Database Schema](../supabase/migrations/001_initial_schema.sql)
- [RLS Policies Guide](../supabase/guides/RLSPolicies.md)
