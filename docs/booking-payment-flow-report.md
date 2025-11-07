# Booking and Payment Flow - Complete System Report

**Last Updated:** 2024  
**Version:** 1.0  
**System:** RentAloo Peer-to-Peer Equipment Rental Marketplace

## Table of Contents
1. [Overview](#overview)
2. [Booking Request Flow](#booking-request-flow)
3. [Payment Processing Flow](#payment-processing-flow)
4. [Messaging/Chat Integration](#messagingchat-integration)
5. [System Automation & Triggers](#system-automation--triggers)
6. [Database Schema](#database-schema)
7. [Status Transitions](#status-transitions)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Security & Row Level Security (RLS)](#security--row-level-security-rls)
10. [Performance Optimizations](#performance-optimizations)
11. [Real-time Features](#real-time-features)
12. [Audit Logging & History](#audit-logging--history)
13. [UI/UX Flow Details](#uiux-flow-details)
14. [Code References & Implementation Details](#code-references--implementation-details)

---

## Overview

The RentAloo platform implements a peer-to-peer equipment rental marketplace with a complete booking and payment system. The flow integrates booking requests, Stripe payment processing, real-time messaging, and automated system triggers to manage the entire rental lifecycle.

**Key Components:**
- **Booking Requests**: Initial rental requests from renters to owners
- **Payments**: Stripe-integrated payment processing with escrow
- **Messaging**: Real-time chat system linked to bookings
- **Automation**: Database triggers for booking creation and availability management

---

## Booking Request Flow

### 1. Booking Request Creation

**Location:** `src/components/booking/BookingRequestForm.tsx`

**Process:**
1. **Renter selects equipment** and fills out booking form:
   - Start date
   - End date
   - Optional message to owner

2. **Real-time validation:**
   - Date conflict checking via `checkBookingConflicts()` function
   - Uses database RPC function `check_booking_conflicts` for performance
   - Validates minimum (1 day) and maximum (30 days) rental periods
   - Checks for overlapping approved bookings

3. **Price calculation:**
   - Calculates daily rate × number of days
   - Adds 5% service fee
   - Formula: `total = subtotal + (subtotal × 0.05)`

4. **Booking request creation:**
   ```typescript
   {
     equipment_id: string,
     renter_id: string,
     start_date: string,
     end_date: string,
     total_amount: number,
     status: "pending",
     message: string | null
   }
   ```

5. **Automatic conversation creation:**
   - System automatically creates a conversation between renter and owner
   - Links conversation to `booking_request_id`
   - Creates conversation participants (renter + owner)

6. **Initial message sent:**
   - System sends an automatic message to the owner:
   ```
   "Hi! I've requested to book your "[Equipment Title]" 
   from [Start Date] to [End Date] ([Duration], $[Total] total)."
   ```
   - Includes any custom message from renter

**Database Tables Involved:**
- `booking_requests` - Main booking request record
- `conversations` - Chat conversation linked to booking
- `conversation_participants` - Participants in the conversation
- `messages` - Initial booking message

---

### 2. Owner Review & Approval

**Location:** `src/components/booking/BookingRequestCard.tsx`

**Owner Actions:**

**A. View Renter Information:**
- Owner can click "View Renter Info" to see renter verification profile
- Displays renter screening information

**B. Approve Booking:**
- Owner clicks "Approve" button
- Status updated: `pending` → `approved`
- System message sent: `"Booking request has been approved! 🎉"`
- Message type: `booking_approved`

**C. Decline Booking:**
- Owner clicks "Decline" button
- Status updated: `pending` → `declined`
- System message sent: `"Booking request has been declined."`
- Message type: `booking_declined`

**D. Cancel Booking:**
- Owner or renter can cancel (if status is `pending` or `approved`)
- Status updated to `cancelled`
- System message sent: `"Booking request has been cancelled."`
- Message type: `booking_cancelled`

**Real-time Updates:**
- Booking status changes are broadcast via Supabase Realtime
- Both renter and owner see status updates immediately
- UI updates automatically via subscription channels

---

### 3. Automated Booking Creation

**Location:** `supabase/migrations/013_booking_approval_automation.sql`

**Database Trigger:** `trigger_booking_approval`

**When:** Booking request status changes to `approved`

**Actions:**
1. **Creates booking record:**
   ```sql
   INSERT INTO bookings (booking_request_id, payment_status, return_status)
   VALUES (booking_request_id, 'pending', 'pending')
   ```

2. **Updates availability calendar:**
   - Marks all dates from `start_date` to `end_date` as unavailable
   - Uses set-based operation for performance
   - Updates `availability_calendar` table

3. **Validation:**
   - Ensures date range ≤ 30 days
   - Validates `end_date > start_date`

**Trigger Function:** `handle_booking_approval()`

---

### 4. Booking Cancellation/Decline Automation

**Database Trigger:** `trigger_booking_cancellation`

**When:** Booking request status changes from `approved` to `declined` or `cancelled`

**Actions:**
1. **Releases availability:**
   - Marks dates as available again in `availability_calendar`
   - Only if no other approved bookings cover those dates
   - Uses smart conflict resolution

2. **Preserves history:**
   - Keeps `bookings` record for audit purposes
   - Does not delete booking record

**Trigger Function:** `handle_booking_cancellation()`

---

## Payment Processing Flow

### 1. Payment Intent Creation

**Location:** `supabase/functions/create-payment-intent/index.ts`

**Trigger:** Renter clicks "Pay Now" button on approved or pending booking

**Process:**

1. **Frontend calls Edge Function:**
   - Endpoint: `/functions/v1/create-payment-intent`
   - Method: POST
   - Auth: Bearer token (JWT from Supabase)

2. **Backend validation:**
   - Verifies user authentication
   - Loads booking request
   - Verifies caller is the renter (not owner)
   - Checks booking status is `pending` or `approved`

3. **Idempotency check:**
   - Prevents duplicate payments
   - Checks for existing `succeeded` payment → returns 409 error
   - If pending payment exists, retrieves existing PaymentIntent from Stripe

4. **Payment calculation:**
   ```typescript
   subtotal = booking_request.total_amount
   service_fee = subtotal × 0.05
   tax = 0
   total = subtotal + service_fee + tax
   ```

5. **Stripe Payment Intent creation:**
   ```typescript
   {
     amount: total × 100, // Convert to cents
     currency: "usd",
     metadata: {
       booking_request_id: string,
       renter_id: string,
       owner_id: string
     }
   }
   ```

6. **Payment record creation:**
   ```typescript
   {
     booking_request_id: string,
     renter_id: string,
     owner_id: string,
     stripe_payment_intent_id: string,
     subtotal: number,
     service_fee: number,
     tax: number,
     total_amount: number,
     escrow_amount: number, // Same as total_amount
     owner_payout_amount: number, // Same as subtotal
     payment_status: "pending",
     escrow_status: "held",
     currency: "usd"
   }
   ```

7. **Returns to frontend:**
   ```typescript
   {
     clientSecret: string, // Stripe client secret
     paymentIntentId: string
   }
   ```

---

### 2. Payment Form & Stripe Elements

**Location:** `src/components/payment/PaymentForm.tsx`

**Process:**

1. **Initialize Stripe:**
   - Loads Stripe.js with publishable key
   - Creates Stripe Elements instance

2. **Payment form display:**
   - Shows Stripe PaymentElement (card input)
   - Displays payment summary:
     - Rental cost (subtotal)
     - Service fee (5%)
     - Tax (0% for MVP)
     - Total amount

3. **User enters card details:**
   - Stripe Elements handles secure card input
   - No card data touches the application server

4. **Payment confirmation:**
   ```typescript
   stripe.confirmPayment({
     elements,
     confirmParams: {
       return_url: `${origin}/payment/confirmation?payment_intent_id=${paymentIntentId}`
     },
     redirect: "if_required"
   })
   ```

5. **Polling for payment record:**
   - After successful payment, polls database for payment record
   - Checks for `payment_status = "succeeded"`
   - Polls up to 20 times (10 seconds total)
   - 500ms interval between polls

6. **Navigation:**
   - On success: Navigate to `/payment/confirmation?payment_id=${paymentId}`
   - On failure: Show error message

---

### 3. Stripe Webhook Processing

**Location:** `supabase/functions/stripe-webhook/index.ts`

**Webhook Events Handled:**

#### A. `payment_intent.succeeded`

**Process:**
1. **Verify webhook signature:**
   - Validates Stripe signature header
   - Uses `STRIPE_WEBHOOK_SECRET`

2. **Update payment record:**
   ```sql
   UPDATE payments
   SET 
     payment_status = 'succeeded',
     failure_reason = NULL,
     stripe_charge_id = charge.id
   WHERE stripe_payment_intent_id = payment_intent.id
   ```

3. **Auto-approve booking request:**
   ```sql
   UPDATE booking_requests
   SET status = 'approved'
   WHERE id = booking_request_id
   ```
   - This triggers `trigger_booking_approval` → creates booking record
   - Updates availability calendar

**Result:**
- Payment status: `pending` → `succeeded`
- Booking request: `pending` → `approved` (if not already approved)
- Booking record created automatically
- Availability calendar updated

#### B. `payment_intent.payment_failed`

**Process:**
1. **Update payment record:**
   ```sql
   UPDATE payments
   SET 
     payment_status = 'failed',
     failure_reason = last_payment_error.message
   WHERE stripe_payment_intent_id = payment_intent.id
   ```

**Result:**
- Payment status: `pending` → `failed`
- Booking request remains in current status
- User can retry payment

---

### 4. Payment Confirmation Page

**Location:** `src/pages/payment/PaymentConfirmation.tsx`

**Process:**

1. **Load payment details:**
   - Queries by `payment_id` or `payment_intent_id`
   - Includes booking request and equipment details
   - Polls if payment not immediately available

2. **Display information:**
   - Payment success confirmation
   - Equipment details
   - Rental dates
   - Payment breakdown (subtotal, fees, total)
   - Transaction ID
   - Escrow status

3. **Next steps:**
   - Contact owner (link to messaging)
   - View bookings
   - Return home

---

### 5. Escrow Management

**Escrow Statuses:**
- `held` - Funds held in escrow (default after payment)
- `released` - Funds released to owner
- `refunded` - Funds refunded to renter
- `disputed` - Payment under dispute

**Escrow Release:**
- Currently manual process (via `usePayment.releaseEscrow()`)
- Owner can release escrow after rental completion
- Updates `escrow_status` to `released`
- Sets `escrow_released_at` timestamp
- Updates booking request status to `completed`

**Future Enhancement:**
- Automatic escrow release after rental end date + buffer period
- Stripe Transfer to owner's connected account

---

## Messaging/Chat Integration

### 1. Conversation Creation

**Location:** `src/hooks/useMessaging.ts`

**Automatic Creation:**
- When booking request is created, conversation is automatically created
- Links conversation to `booking_request_id`
- Adds both renter and owner as participants

**Manual Creation:**
- Users can also create conversations via `getOrCreateConversation()`
- Checks for existing conversation with same participants and booking_request_id
- Creates new conversation if none exists

**Conversation Structure:**
```typescript
{
  id: UUID,
  booking_request_id: UUID | null,
  participants: UUID[],
  created_at: timestamp,
  updated_at: timestamp
}
```

---

### 2. Message Types

**Location:** `src/types/messaging.ts`

**Message Types:**
- `text` - Regular user message
- `system` - System notification
- `booking_update` - Booking status update
- `booking_approved` - Booking approved notification
- `booking_cancelled` - Booking cancelled notification
- `booking_declined` - Booking declined notification

**System Messages:**
- Automatically sent when booking status changes
- Styled differently in UI (centered, colored badges)
- Cannot be edited or deleted

---

### 3. Real-time Messaging

**Location:** `supabase/migrations/007_realtime_messaging.sql`

**Real-time Channels:**

1. **Room Channel:**
   - Channel: `room:{conversation_id}:messages`
   - Broadcasts new messages to all conversation participants
   - Trigger: `notify_message_created_trg`

2. **User Channel:**
   - Channel: `user:{user_id}:conversations`
   - Notifies user of new conversations or messages
   - Trigger: `notify_conversation_participant_added_trg`

**Broadcast Function:**
```sql
realtime.broadcast_changes(
  channel,
  'message_created',
  'INSERT',
  table_name,
  schema,
  new_record,
  old_record
)
```

**Frontend Subscription:**
- Subscribes to conversation-specific channels
- Receives real-time message updates
- Updates UI immediately when new messages arrive

---

### 4. Message Flow in Booking Context

**Initial Booking Message:**
- Sent automatically when booking request is created
- Includes booking details (dates, duration, total)
- Includes custom message from renter

**Status Change Messages:**
- Sent when owner approves/declines/cancels
- Sent when renter cancels
- Message type indicates the action taken

**Regular Messages:**
- Users can send text messages at any time
- Linked to conversation
- Displayed in chronological order

**Message Display:**
- System messages: Centered, colored badges
- User messages: Left/right aligned based on sender
- Timestamps shown with relative time (e.g., "2 minutes ago")

---

## System Automation & Triggers

### 1. Booking Approval Trigger

**Trigger:** `trigger_booking_approval`
**Table:** `booking_requests`
**Event:** `UPDATE` when `status = 'approved'`

**Function:** `handle_booking_approval()`

**Actions:**
1. Validates date range (max 30 days)
2. Creates `bookings` record
3. Marks dates as unavailable in `availability_calendar`

**SQL:**
```sql
CREATE TRIGGER trigger_booking_approval
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_booking_approval();
```

---

### 2. Booking Cancellation Trigger

**Trigger:** `trigger_booking_cancellation`
**Table:** `booking_requests`
**Event:** `UPDATE` when status changes from `approved` to `declined`/`cancelled`

**Function:** `handle_booking_cancellation()`

**Actions:**
1. Marks dates as available in `availability_calendar`
2. Checks for conflicts with other approved bookings
3. Only releases dates if no other bookings cover them

---

### 3. Payment Webhook Auto-Approval

**Location:** `supabase/functions/stripe-webhook/index.ts`

**Process:**
- When `payment_intent.succeeded` event received
- Automatically updates booking request status to `approved`
- This triggers `trigger_booking_approval` → creates booking record

**Flow:**
```
Payment Succeeded → Webhook → Update booking_request.status = 'approved' 
→ Trigger → Create booking record → Update availability calendar
```

---

### 4. Real-time Message Broadcasting

**Trigger:** `notify_message_created_trg`
**Table:** `messages`
**Event:** `INSERT`

**Function:** `notify_message_created()`

**Actions:**
1. Broadcasts message to room channel
2. Sends notification to all conversation participants
3. Updates conversation `updated_at` timestamp

---

## Database Schema

### Core Tables

#### `booking_requests`
```sql
{
  id: UUID PRIMARY KEY,
  equipment_id: UUID REFERENCES equipment(id),
  renter_id: UUID REFERENCES profiles(id),
  start_date: DATE,
  end_date: DATE,
  total_amount: DECIMAL(10,2),
  status: booking_status, -- 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
  message: TEXT,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

#### `bookings`
```sql
{
  id: UUID PRIMARY KEY,
  booking_request_id: UUID REFERENCES booking_requests(id) UNIQUE,
  payment_status: TEXT,
  pickup_method: TEXT,
  return_status: TEXT,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

#### `payments`
```sql
{
  id: UUID PRIMARY KEY,
  booking_request_id: UUID REFERENCES booking_requests(id),
  renter_id: UUID REFERENCES profiles(id),
  owner_id: UUID REFERENCES profiles(id),
  stripe_payment_intent_id: TEXT UNIQUE,
  stripe_charge_id: TEXT,
  stripe_transfer_id: TEXT,
  payment_method_id: TEXT,
  subtotal: DECIMAL(10,2),
  service_fee: DECIMAL(10,2),
  tax: DECIMAL(10,2),
  total_amount: DECIMAL(10,2),
  escrow_amount: DECIMAL(10,2),
  owner_payout_amount: DECIMAL(10,2),
  payment_status: TEXT, -- 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'
  escrow_status: TEXT, -- 'held' | 'released' | 'refunded' | 'disputed'
  payout_status: TEXT, -- 'pending' | 'processing' | 'completed' | 'failed'
  refund_amount: DECIMAL(10,2),
  refund_reason: TEXT,
  currency: TEXT,
  failure_reason: TEXT,
  escrow_released_at: TIMESTAMPTZ,
  payout_processed_at: TIMESTAMPTZ,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

#### `conversations`
```sql
{
  id: UUID PRIMARY KEY,
  booking_request_id: UUID REFERENCES booking_requests(id),
  participants: UUID[],
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

#### `messages`
```sql
{
  id: UUID PRIMARY KEY,
  conversation_id: UUID REFERENCES conversations(id),
  sender_id: UUID REFERENCES profiles(id),
  content: TEXT,
  message_type: TEXT, -- 'text' | 'system' | 'booking_approved' | 'booking_cancelled' | 'booking_declined'
  created_at: TIMESTAMPTZ
}
```

#### `availability_calendar`
```sql
{
  equipment_id: UUID REFERENCES equipment(id),
  date: DATE,
  is_available: BOOLEAN,
  UNIQUE(equipment_id, date)
}
```

---

## Status Transitions

### Booking Request Status Flow

```
[pending] 
  ├─→ [approved] (via owner approval OR payment webhook)
  │     ├─→ [completed] (after rental ends)
  │     └─→ [cancelled] (by owner or renter)
  │
  ├─→ [declined] (via owner decline)
  │
  └─→ [cancelled] (by owner or renter)
```

**Status Definitions:**
- `pending` - Awaiting owner approval
- `approved` - Owner approved, awaiting payment (or payment received)
- `declined` - Owner declined the request
- `cancelled` - Request cancelled by owner or renter
- `completed` - Rental completed successfully

---

### Payment Status Flow

```
[pending]
  ├─→ [processing] (payment in progress)
  │     ├─→ [succeeded] (payment successful)
  │     │     └─→ [refunded] (if refund processed)
  │     │
  │     └─→ [failed] (payment failed)
  │
  └─→ [cancelled] (payment cancelled)
```

**Status Definitions:**
- `pending` - Payment intent created, awaiting confirmation
- `processing` - Payment being processed by Stripe
- `succeeded` - Payment successful, funds in escrow
- `failed` - Payment failed (card declined, etc.)
- `refunded` - Payment refunded to renter
- `cancelled` - Payment cancelled

---

### Escrow Status Flow

```
[held] (default after payment)
  ├─→ [released] (funds released to owner)
  ├─→ [refunded] (funds refunded to renter)
  └─→ [disputed] (payment under dispute)
```

---

## Error Handling & Edge Cases

### 1. Payment Idempotency

**Problem:** Prevent duplicate payments for same booking

**Solution:**
- Check for existing `succeeded` payment before creating new PaymentIntent
- Return 409 error if payment already exists
- Reuse existing PaymentIntent if pending payment exists

**Location:** `supabase/functions/create-payment-intent/index.ts` (lines 109-164)

---

### 2. Webhook Retry Handling

**Problem:** Stripe webhooks may be retried if endpoint fails

**Solution:**
- Webhook handler is idempotent
- Updates are safe to retry
- Returns 200 even if update fails (logs error but doesn't fail webhook)

**Location:** `supabase/functions/stripe-webhook/index.ts`

---

### 3. Payment Polling

**Problem:** Webhook may be delayed, user needs immediate feedback

**Solution:**
- Frontend polls database after payment confirmation
- Polls up to 20 times (10 seconds)
- 500ms interval between polls
- Falls back to navigation with warning if polling fails

**Location:** `src/components/payment/PaymentForm.tsx` (lines 86-131)

---

### 4. Conversation Creation Failure

**Problem:** Conversation creation might fail, but booking should still succeed

**Solution:**
- Conversation creation wrapped in try-catch
- Booking request creation doesn't fail if conversation fails
- Error logged but not thrown

**Location:** `src/components/booking/BookingRequestForm.tsx` (lines 195-236)

---

### 5. Availability Conflict Resolution

**Problem:** Multiple bookings might conflict on same dates

**Solution:**
- Database function `check_booking_conflicts` validates before booking creation
- Uses index `idx_booking_requests_conflict_check` for performance
- Cancellation trigger checks for other approved bookings before releasing dates

**Location:** `supabase/migrations/013_booking_approval_automation.sql`

---

### 6. Real-time Subscription Cleanup

**Problem:** Memory leaks from unclosed subscriptions

**Solution:**
- All subscriptions cleaned up in `useEffect` cleanup functions
- Channels removed when component unmounts

**Location:** `src/components/booking/BookingRequestCard.tsx` (lines 133-137)

---

## Key Integration Points

### 1. Booking → Payment
- Booking request must exist before payment
- Payment links to `booking_request_id`
- Payment success auto-approves booking request

### 2. Payment → Booking
- Webhook updates booking request status
- Triggers booking record creation
- Updates availability calendar

### 3. Booking → Messaging
- Conversation automatically created with booking
- System messages sent on status changes
- Messages linked to booking via `booking_request_id`

### 4. Messaging → Booking
- Users can discuss booking details in chat
- Messages provide context for booking decisions

---

## System Information

### Environment Variables Required

**Frontend:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

**Backend (Edge Functions):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

---

### API Endpoints

**Supabase Edge Functions:**
1. `/functions/v1/create-payment-intent` - Create Stripe PaymentIntent
2. `/functions/v1/stripe-webhook` - Handle Stripe webhooks
3. `/functions/v1/process-refund` - Process refunds (future)

---

### Database Functions

1. `check_booking_conflicts()` - Validates booking date conflicts
2. `handle_booking_approval()` - Creates booking and updates availability
3. `handle_booking_cancellation()` - Releases availability on cancellation
4. `notify_message_created()` - Broadcasts new messages
5. `notify_conversation_participant_added()` - Notifies new participants

---

### Database Triggers

1. `trigger_booking_approval` - Auto-creates booking on approval
2. `trigger_booking_cancellation` - Releases availability on cancellation
3. `trigger_booking_initial_approval` - Handles initial approval on INSERT
4. `notify_message_created_trg` - Broadcasts messages in real-time
5. `notify_conversation_participant_added_trg` - Notifies new participants

---

## Security & Row Level Security (RLS)

### Overview

The system implements comprehensive Row Level Security (RLS) policies to ensure users can only access data they're authorized to view or modify. All policies use optimized patterns for performance.

### RLS Policy Patterns

**Key Optimization:** All policies use `(select auth.uid())` instead of `auth.uid()` to prevent re-evaluation and improve performance.

**Null Guards:** All policies include `(select auth.uid()) IS NOT NULL` checks to reject unauthenticated requests early.

**Role Restrictions:** Policies explicitly specify `TO authenticated` or `TO anon` where appropriate.

### Booking Requests RLS Policies

**Location:** `supabase/migrations/017_rls_performance_optimizations.sql`, `supabase/migrations/019_consolidate_multiple_permissive_policies.sql`

#### SELECT Policy
**Policy Name:** "Authenticated users can view booking requests"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    -- Users can view their own booking requests
    (select auth.uid()) = renter_id
    OR
    -- Equipment owners can view requests for their equipment
    EXISTS (
      SELECT 1 FROM equipment 
      WHERE equipment.id = booking_requests.equipment_id 
      AND equipment.owner_id = (select auth.uid())
    )
    OR
    -- Users can view booking requests for available equipment they're viewing
    EXISTS (
      SELECT 1 FROM equipment 
      WHERE equipment.id = booking_requests.equipment_id 
      AND equipment.is_available = true
    )
  )
)
```

**Indexes Used:**
- `idx_booking_requests_renter_id` on `renter_id`
- `idx_booking_requests_equipment_id` on `equipment_id`
- `idx_equipment_owner_id` on `equipment.owner_id`

#### INSERT Policy
**Policy Name:** "Renters can create booking requests"

**Logic:**
```sql
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  (select auth.uid()) = renter_id
)
```

#### UPDATE Policy
**Policy Name:** "Authenticated users can update booking requests"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    -- Equipment owners can update booking requests for their equipment
    EXISTS (
      SELECT 1 FROM equipment 
      WHERE equipment.id = booking_requests.equipment_id 
      AND equipment.owner_id = (select auth.uid())
    )
    OR
    -- Renters can cancel their own booking requests
    (select auth.uid()) = renter_id
  )
)
```

### Payments RLS Policies

**Location:** `supabase/migrations/019_consolidate_multiple_permissive_policies.sql`

#### SELECT Policy
**Policy Name:** "Authenticated users can view payments"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    -- Renters can view their own payments
    EXISTS (
      SELECT 1 FROM booking_requests 
      WHERE booking_requests.id = payments.booking_request_id 
      AND booking_requests.renter_id = (select auth.uid())
    )
    OR
    -- Owners can view their payouts
    EXISTS (
      SELECT 1 FROM booking_requests 
      JOIN equipment ON equipment.id = booking_requests.equipment_id
      WHERE booking_requests.id = payments.booking_request_id 
      AND equipment.owner_id = (select auth.uid())
    )
  )
)
```

**Indexes Used:**
- `idx_payments_booking_request` on `booking_request_id`
- `idx_booking_requests_renter_id` on `booking_requests.renter_id`
- `idx_equipment_owner_id` on `equipment.owner_id`

#### INSERT Policy
**Policy Name:** "System can create payments"

**Logic:** Allows any authenticated user to create payments (handled by backend Edge Functions)

#### UPDATE Policy
**Policy Name:** "System can update payments"

**Logic:** Allows system to update payments (handled by webhooks and Edge Functions)

### Bookings RLS Policies

#### SELECT Policy
**Policy Name:** "Authenticated users can view bookings"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    -- Users can view their own bookings
    EXISTS (
      SELECT 1 FROM booking_requests 
      WHERE booking_requests.id = bookings.booking_request_id 
      AND booking_requests.renter_id = (select auth.uid())
    )
    OR
    -- Equipment owners can view bookings for their equipment
    EXISTS (
      SELECT 1 FROM booking_requests 
      JOIN equipment ON equipment.id = booking_requests.equipment_id
      WHERE booking_requests.id = bookings.booking_request_id 
      AND equipment.owner_id = (select auth.uid())
    )
  )
)
```

### Messages RLS Policies

#### SELECT Policy
**Policy Name:** "Users can view messages in their conversations"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (select auth.uid()) = ANY(conversations.participants)
  )
)
```

#### INSERT Policy
**Policy Name:** "Users can send messages to their conversations"

**Logic:**
```sql
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND
  (select auth.uid()) = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (select auth.uid()) = ANY(conversations.participants)
  )
)
```

### Conversations RLS Policies

#### SELECT Policy
**Policy Name:** "Users can view conversations they participate in"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND 
  (select auth.uid()) = ANY(participants)
)
```

### RLS Performance Optimizations

**Location:** `supabase/migrations/017_rls_performance_optimizations.sql`

**Key Optimizations:**
1. **Indexes on all RLS policy columns** - Ensures fast lookups
2. **Consolidated policies** - Reduces policy evaluation overhead
3. **Null guards** - Early rejection of unauthenticated requests
4. **Subquery pattern** - `(select auth.uid())` prevents re-evaluation

**Indexes Created for RLS:**
- `idx_booking_requests_renter_id`
- `idx_booking_requests_equipment_id`
- `idx_equipment_owner_id`
- `idx_bookings_booking_request_id`
- `idx_payments_booking_request`
- `idx_messages_conversation_id`
- `idx_messages_sender_id`
- `idx_conversation_participants_conversation_id`
- `idx_conversation_participants_profile_id`

---

## Performance Optimizations

### Database Indexes

**Location:** Multiple migrations, primarily `supabase/migrations/016_booking_system_performance_optimizations.sql`

#### Booking Requests Indexes

1. **Conflict Check Index:**
   ```sql
   CREATE INDEX idx_booking_requests_conflict_check
   ON booking_requests (equipment_id, status, start_date, end_date)
   WHERE status IN ('pending', 'approved');
   ```
   **Purpose:** Optimizes conflict checking queries
   **Used By:** `check_booking_conflicts()` function

2. **Created At Index:**
   ```sql
   CREATE INDEX idx_booking_requests_created_at_desc
   ON booking_requests (created_at DESC);
   ```
   **Purpose:** Fast ordering for dashboards

3. **Equipment Status Created Index:**
   ```sql
   CREATE INDEX idx_booking_requests_equipment_status_created
   ON booking_requests (equipment_id, status, created_at DESC)
   WHERE status IN ('pending', 'approved', 'declined', 'cancelled');
   ```
   **Purpose:** Optimizes owner dashboard queries

4. **Renter Status Created Index:**
   ```sql
   CREATE INDEX idx_booking_requests_renter_status_created
   ON booking_requests (renter_id, status, created_at DESC);
   ```
   **Purpose:** Optimizes renter dashboard queries

5. **Status Dates Index:**
   ```sql
   CREATE INDEX idx_booking_requests_status_dates
   ON booking_requests (status, start_date, end_date)
   WHERE status IN ('pending', 'approved');
   ```
   **Purpose:** Optimizes date range queries

6. **Updated At Index:**
   ```sql
   CREATE INDEX idx_booking_requests_updated_at
   ON booking_requests (updated_at DESC);
   ```
   **Purpose:** Tracks recent changes

#### Payments Indexes

1. **Status Created At Index:**
   ```sql
   CREATE INDEX idx_payments_status_created_at
   ON payments (payment_status, created_at DESC);
   ```
   **Purpose:** Optimizes payment history queries

2. **Base Indexes:**
   - `idx_payments_booking_request` on `booking_request_id`
   - `idx_payments_renter` on `renter_id`
   - `idx_payments_owner` on `owner_id`
   - `idx_payments_status` on `payment_status`
   - `idx_payments_escrow_status` on `escrow_status`
   - `idx_payments_created_at` on `created_at DESC`

#### Availability Calendar Indexes

1. **Date Index:**
   ```sql
   CREATE INDEX idx_availability_calendar_date
   ON availability_calendar (date);
   ```
   **Purpose:** Fast date range queries

2. **Equipment Date Range Index:**
   ```sql
   CREATE INDEX idx_availability_calendar_equipment_date_range
   ON availability_calendar (equipment_id, date);
   ```
   **Purpose:** Optimizes availability queries by equipment and date

#### Bookings Indexes

1. **Payment Status Index:**
   ```sql
   CREATE INDEX idx_bookings_payment_status
   ON bookings (payment_status);
   ```

2. **Return Status Index:**
   ```sql
   CREATE INDEX idx_bookings_return_status
   ON bookings (return_status);
   ```

3. **Created At Index:**
   ```sql
   CREATE INDEX idx_bookings_created_at_desc
   ON bookings (created_at DESC);
   ```

#### Booking History Indexes

1. **Booking Request ID Index:**
   ```sql
   CREATE INDEX idx_booking_history_booking_request_id
   ON booking_history (booking_request_id);
   ```

2. **Changed At Index:**
   ```sql
   CREATE INDEX idx_booking_history_changed_at
   ON booking_history (changed_at DESC);
   ```

3. **Changed By Index:**
   ```sql
   CREATE INDEX idx_booking_history_changed_by
   ON booking_history (changed_by);
   ```

### Query Optimization Strategies

1. **Partial Indexes:** Used for status-specific queries (e.g., only index `pending` and `approved` bookings)
2. **Composite Indexes:** Combine multiple columns for common query patterns
3. **Covering Indexes:** Include frequently accessed columns to avoid table lookups
4. **Index-Only Scans:** Some queries can be satisfied entirely from indexes

### Function Performance

**Database Functions with Performance Optimizations:**

1. **`check_booking_conflicts()`:**
   - Uses `idx_booking_requests_conflict_check` index
   - Returns boolean for fast evaluation
   - Accepts `p_exclude_booking_id` for update scenarios

2. **`handle_booking_approval()`:**
   - Uses set-based operations for availability calendar updates
   - Single INSERT with ON CONFLICT for all dates
   - Validates date range before processing

3. **`handle_booking_cancellation()`:**
   - Uses set-based operations for availability recomputation
   - Checks for remaining approved bookings before releasing dates
   - Single UPSERT operation for all dates

---

## Real-time Features

### Real-time Messaging

**Location:** `supabase/migrations/007_realtime_messaging.sql`, `src/hooks/useMessaging.ts`

#### Message Broadcasting

**Trigger:** `notify_message_created_trg`
**Function:** `notify_message_created()`

**Process:**
1. When a message is inserted, trigger fires
2. Broadcasts to room channel: `room:{conversation_id}:messages`
3. Sends notification to all participants via user channels: `user:{user_id}:conversations`

**Channel Structure:**
- **Room Channel:** `room:{conversation_id}:messages` - All participants subscribe
- **User Channel:** `user:{user_id}:conversations` - Individual user notifications

**Frontend Subscription:**
```typescript
// Subscribe to conversation-specific channel
const channel = supabase
  .channel(`room:${conversationId}:messages`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe();
```

#### Typing Indicators

**Location:** `src/components/messaging/MessagingInterface.tsx`, `supabase/migrations/008_add_presence_tracking.sql`

**Implementation:**
1. User types in message input
2. Broadcasts typing event via Realtime channel
3. Other participants receive typing status
4. Auto-stops after 3 seconds of inactivity

**Channel:** `room:{conversation_id}:messages` with broadcast event `typing`

**RLS Policy:** "authenticated can send typing events"
- Allows authenticated users to send typing events on conversation channels
- Requires user to be a conversation participant

**Code Reference:**
```165:200:src/components/messaging/MessagingInterface.tsx
const handleTyping = (content: string) => {
  if (!selectedConversation || !user?.id || !typingChannelRef.current) return;

  // Clear existing timeout
  const existingTimeout = typingTimeoutRef.current.get(
    selectedConversation.id
  );
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Broadcast typing status
  void typingChannelRef.current.send({
    type: "broadcast",
    event: "typing",
    payload: {
      user_id: user.id,
      conversation_id: selectedConversation.id,
      is_typing: content.length > 0,
    },
  });

  // Set timeout to stop typing after 3 seconds of inactivity
  if (content.length > 0) {
    const timeout = setTimeout(() => {
      void typingChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: user.id,
          conversation_id: selectedConversation.id,
          is_typing: false,
        },
      });
      typingTimeoutRef.current.delete(selectedConversation.id);
    }, 3000);
```

### Presence Tracking

**Location:** `src/hooks/usePresence.ts`, `supabase/migrations/008_add_presence_tracking.sql`

#### Online Status

**Implementation:**
1. User connects → Tracks presence on global channel
2. Heartbeat every 5 minutes to maintain online status
3. Page visibility changes → Stops/resumes tracking
4. User disconnects → Untracks presence

**Channel:** `presence:global`

**Presence Data:**
```typescript
{
  user_id: string,
  online_at: string, // ISO timestamp
  status: "online" | "away" | "busy"
}
```

**Events:**
- `presence` event `sync` - Initial state when joining
- `presence` event `join` - User comes online
- `presence` event `leave` - User goes offline

**RLS Policies:**
- "authenticated can track presence" - Allows tracking on presence channels
- "authenticated can receive presence" - Allows receiving presence updates

**Code Reference:**
```38:52:src/hooks/usePresence.ts
const trackPresence = useCallback(async () => {
  if (!user?.id || !channelRef.current) return;

  const presenceData: UserPresence = {
    user_id: user.id,
    online_at: new Date().toISOString(),
    status: "online",
  };

  try {
    await channelRef.current.track(presenceData);
  } catch (error) {
    console.error("Error tracking presence:", error);
  }
}, [user?.id]);
```

#### Last Seen Tracking

**Database Column:** `profiles.last_seen_at`

**Update Mechanism:**
- Updated via database trigger when user activity occurs
- Can be updated manually via RLS policy

**RLS Policy:** "users can update own last_seen_at"
- Users can update their own `last_seen_at` timestamp

**RLS Policy:** "users can read last_seen_at in conversations"
- Users can view `last_seen_at` for conversation participants

### Real-time Booking Updates

**Location:** `src/components/booking/BookingRequestCard.tsx`

#### Booking Status Updates

**Subscription:**
```typescript
const bookingChannel = supabase
  .channel(`booking-${bookingRequest.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'booking_requests',
    filter: `id=eq.${bookingRequest.id}`
  }, () => {
    // Refresh booking status
    onStatusChange?.();
  })
  .subscribe();
```

**Use Cases:**
- Owner approves/declines booking → Renter sees update immediately
- Payment webhook updates status → Both parties see update
- Status changes trigger UI updates without page refresh

#### Payment Status Updates

**Subscription:**
```typescript
const paymentChannel = supabase
  .channel(`payment-${bookingRequest.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'payments',
    filter: `booking_request_id=eq.${bookingRequest.id}`
  }, (payload) => {
    if (payload.new?.payment_status === 'succeeded') {
      setHasPayment(true);
      onStatusChange?.();
    }
  })
  .subscribe();
```

**Use Cases:**
- Payment succeeds → UI updates to show payment received
- Payment fails → UI shows error state
- Escrow released → Owner sees payout status

---

## Audit Logging & History

### Booking History Table

**Location:** `supabase/migrations/015_booking_system_medium_priority_fixes.sql`

#### Schema

```sql
CREATE TABLE booking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  metadata JSONB
);
```

#### Purpose

- **Audit Trail:** Track all status changes for booking requests
- **Compliance:** Maintain history for dispute resolution
- **Analytics:** Analyze booking patterns and status transitions
- **Debugging:** Investigate issues with booking status changes

#### Automatic Logging

**Trigger:** `trigger_log_booking_status_change`
**Function:** `log_booking_status_change()`

**Process:**
1. Trigger fires on `UPDATE` of `status` column in `booking_requests`
2. Only logs if status actually changed (`IS DISTINCT FROM`)
3. Captures:
   - `old_status` - Previous status
   - `new_status` - New status
   - `changed_by` - User who made the change (from `auth.uid()`)
   - `changed_at` - Timestamp of change
   - `reason` - Optional reason (can be set by application code)

**Code Reference:**
```69:92:supabase/migrations/015_booking_system_medium_priority_fixes.sql
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO booking_history (
      booking_request_id,
      old_status,
      new_status,
      changed_by,
      reason
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(), -- Get current user from Supabase auth
      NULL -- Can be set by application code
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### RLS Policy

**Policy Name:** "Users can view their own booking history"

**Logic:**
```sql
USING (
  (select auth.uid()) IS NOT NULL AND
  (
    -- Check if user is the renter
    EXISTS (
      SELECT 1 FROM booking_requests
      WHERE booking_requests.id = booking_history.booking_request_id
      AND booking_requests.renter_id = (select auth.uid())
    )
    OR
    -- Check if user is the owner
    EXISTS (
      SELECT 1 FROM booking_requests br
      JOIN equipment e ON br.equipment_id = e.id
      WHERE br.id = booking_history.booking_request_id
      AND e.owner_id = (select auth.uid())
    )
  )
)
```

**Access:**
- Renters can view history for their bookings
- Owners can view history for bookings on their equipment
- System can insert history records (via trigger)

#### Indexes

1. **Booking Request ID Index:**
   ```sql
   CREATE INDEX idx_booking_history_booking_request_id
   ON booking_history (booking_request_id);
   ```
   **Purpose:** Fast lookups by booking request

2. **Changed At Index:**
   ```sql
   CREATE INDEX idx_booking_history_changed_at
   ON booking_history (changed_at DESC);
   ```
   **Purpose:** Chronological ordering

3. **Changed By Index:**
   ```sql
   CREATE INDEX idx_booking_history_changed_by
   ON booking_history (changed_by);
   ```
   **Purpose:** Find changes by specific user

#### Use Cases

1. **Dispute Resolution:**
   - Review complete history of booking status changes
   - Identify who made each change and when
   - Understand sequence of events leading to dispute

2. **Analytics:**
   - Analyze booking approval rates
   - Track cancellation patterns
   - Identify common status transition paths

3. **Debugging:**
   - Investigate unexpected status changes
   - Verify trigger execution
   - Track system vs user-initiated changes

---

## UI/UX Flow Details

### Booking Request Form

**Location:** `src/components/booking/BookingRequestForm.tsx`

#### Form Validation

**Schema:** Zod validation schema
```typescript
const bookingFormSchema = z
  .object({
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    message: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    }
  );
```

#### Real-time Conflict Checking

**Implementation:**
```103:163:src/components/booking/BookingRequestForm.tsx
useEffect(() => {
  if (watchedStartDate && watchedEndDate) {
    const newCalculation = calculateBookingTotal(
      equipment.daily_rate,
      watchedStartDate,
      watchedEndDate
    );
    setCalculation(newCalculation);
    onCalculationChange?.(newCalculation, watchedStartDate, watchedEndDate);

    // Increment request ID to mark this request as the latest
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    // Use async database function for conflict checking with proper error handling and race condition protection
    const checkConflicts = async () => {
      setLoadingConflicts(true);
      try {
        const result = await checkBookingConflicts(
          equipment.id,
          watchedStartDate,
          watchedEndDate
        );

        // Only apply results if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setConflicts(result);
        }
      } catch (error) {
        // Only apply error handling if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          console.error("Error checking booking conflicts:", error);
          // Set persistent fallback conflict to prevent submission
          // This prevents the form from being submittable when availability check fails
          setConflicts([
            {
              type: "unavailable",
              message: "Could not verify availability — please try again",
            },
          ]);
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setLoadingConflicts(false);
        }
      }
    };

    void checkConflicts();

    // Cleanup: mark request as stale on unmount or dependency change
    return () => {
      requestIdRef.current += 1;
    };
  } else {
    // Reset calculation when no dates are selected
    setCalculation(null);
    onCalculationChange?.(null, "", "");
  }
}, [watchedStartDate, watchedEndDate, equipment.daily_rate, equipment.id, onCalculationChange]);
```

**Features:**
- **Race Condition Protection:** Uses `requestIdRef` to ignore stale results
- **Real-time Updates:** Checks conflicts as user changes dates
- **Error Handling:** Shows fallback conflict if check fails
- **Loading States:** Shows loading indicator during conflict check

#### Price Calculation Display

**Real-time Calculation:**
- Updates automatically when dates change
- Shows breakdown: daily rate × days + service fee
- Displays total amount prominently

**Calculation Logic:**
```7:49:src/lib/booking.ts
export const calculateBookingTotal = (
  dailyRate: number,
  startDate: string,
  endDate: string,
  customRates?: AvailabilitySlot[]
): BookingCalculation => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  let subtotal = 0;

  // Calculate subtotal based on custom rates if available
  if (customRates && customRates.length > 0) {
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      const customSlot = customRates.find((slot) => slot.date === dateStr);
      const rate = customSlot?.custom_rate || dailyRate;
      subtotal += rate;
    }
  } else {
    subtotal = dailyRate * days;
  }

  // Calculate fees (5% service fee)
  const serviceFeeRate = 0.05;
  const fees = subtotal * serviceFeeRate;
  const total = subtotal + fees;

  return {
    daily_rate: dailyRate,
    days,
    subtotal,
    fees,
    total,
    currency: "USD",
  };
};
```

### Booking Request Card

**Location:** `src/components/booking/BookingRequestCard.tsx`

#### Status-Specific UI

**Pending Status:**
- Shows "Waiting for approval" message
- Owner sees "Approve" and "Decline" buttons
- Renter sees "Pay Now" button (optional)
- Shows payment status if payment exists

**Approved Status:**
- Shows "Approved" badge
- Renter sees "Pay Now" button if no payment
- Owner sees "Waiting for payment" message
- Shows payment confirmation if payment succeeded

**Declined Status:**
- Shows "Declined" badge with red styling
- No action buttons available
- System message explains decline

**Cancelled Status:**
- Shows "Cancelled" badge
- No action buttons available
- System message explains cancellation

**Completed Status:**
- Shows "Completed" badge
- Payment released to owner
- Review options available

#### Real-time Status Updates

**Subscription Setup:**
```115:137:src/components/booking/BookingRequestCard.tsx
// Subscribe to real-time booking request status updates
const bookingChannel = supabase
  .channel(`booking-${bookingRequest.id}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "booking_requests",
      filter: `id=eq.${bookingRequest.id}`,
    },
    () => {
      // Refresh booking status when webhook updates it
      onStatusChange?.();
    }
  )
  .subscribe();

return () => {
  void supabase.removeChannel(paymentChannel);
  void supabase.removeChannel(bookingChannel);
};
```

**Benefits:**
- Instant UI updates when status changes
- No page refresh required
- Works across multiple browser tabs
- Updates for both owner and renter simultaneously

### Payment Form

**Location:** `src/components/payment/PaymentForm.tsx`

#### Stripe Elements Integration

**Initialization:**
```248:277:src/components/payment/PaymentForm.tsx
useEffect(() => {
  const initializePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize Stripe
      const stripe = getStripe();
      setStripePromise(stripe);

      // Create payment intent via Edge Function
      const { clientSecret, paymentIntentId } =
        await createPaymentIntent(bookingRequestId);

      setClientSecret(secret);
      setPaymentIntentId(intentId);
    } catch (err) {
      console.error("Error initializing payment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initialize payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  void initializePayment();
}, [bookingRequestId]);
```

#### Payment Confirmation Flow

**Process:**
1. User enters card details in Stripe Elements
2. Clicks "Pay" button
3. Stripe confirms payment
4. Frontend polls database for payment record
5. Navigates to confirmation page on success

**Polling Logic:**
```86:131:src/components/payment/PaymentForm.tsx
// Poll for payment record (up to 10 seconds with backoff)
const maxAttempts = 20;
const pollInterval = 500; // 500ms

const pollPayment = async (): Promise<string | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("payment_status", "succeeded")
      .maybeSingle();

    if (payment) {
      return payment.id;
    }

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected during polling
      console.error("Error polling payment:", fetchError);
    }
  }
  return null;
};

const paymentId = await pollPayment();

if (paymentId) {
  // Navigate to confirmation page
  void navigate(`/payment/confirmation?payment_id=${paymentId}`);
  onSuccess?.(paymentId);
} else {
  // Payment succeeded but record not found yet
  // Still navigate but show warning
  setError(
    "Payment succeeded but confirmation is pending. Please check your payment status."
  );
  // Still navigate after a short delay
  setTimeout(() => {
    void navigate(
      `/payment/confirmation?payment_intent_id=${paymentIntentId}`
    );
  }, 2000);
}
```

### Messaging Interface

**Location:** `src/components/messaging/MessagingInterface.tsx`

#### Conversation List

**Features:**
- Shows all conversations user participates in
- Displays last message preview
- Shows unread count badge
- Filters: All, Unread, Bookings
- Search functionality (Cmd/Ctrl + K)

#### Message Display

**Features:**
- Auto-scrolls to bottom on new messages
- Shows typing indicators
- Displays online status
- Shows "last seen" timestamps
- System messages styled differently

**Auto-scroll:**
```70:77:src/components/messaging/MessagingInterface.tsx
// Auto-scroll to bottom when new messages arrive
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

useEffect(() => {
  scrollToBottom();
}, [messages]);
```

#### Typing Indicators

**Implementation:**
- Broadcasts typing status when user types
- Auto-stops after 3 seconds of inactivity
- Shows typing indicator for other participants
- Uses Realtime broadcast events

---

## Code References & Implementation Details

### Key Files and Line Numbers

#### Booking Request Form
- **File:** `src/components/booking/BookingRequestForm.tsx`
- **Form Schema:** Lines 34-50
- **Conflict Checking:** Lines 103-163
- **Form Submission:** Lines 165-246
- **Form Content Component:** Lines 312-447

#### Booking Request Card
- **File:** `src/components/booking/BookingRequestCard.tsx`
- **Real-time Subscriptions:** Lines 59-137
- **Status Update Handler:** Lines 139-210
- **Messaging Integration:** Lines 212-241
- **Payment Integration:** Lines 434-447

#### Payment Form
- **File:** `src/components/payment/PaymentForm.tsx`
- **Payment Initialization:** Lines 248-277
- **Payment Submission:** Lines 52-141
- **Polling Logic:** Lines 86-131

#### Payment Confirmation
- **File:** `src/pages/payment/PaymentConfirmation.tsx`
- **Payment Loading:** Lines 37-141
- **Payment Display:** Lines 192-416

#### Messaging Hook
- **File:** `src/hooks/useMessaging.ts`
- **Message Sending:** Lines 934-1025
- **Conversation Fetching:** Lines 837-931

#### Booking Hook
- **File:** `src/hooks/useBookingRequests.ts`
- **Fetch Logic:** Lines 32-152
- **Status Updates:** Lines 185-206

#### Payment Hook
- **File:** `src/hooks/usePayment.ts`
- **Payment Creation:** Lines 31-101
- **Escrow Release:** Lines 263-318

#### Database Functions
- **Conflict Check:** `supabase/migrations/014_booking_system_high_priority_fixes.sql` Lines 73-98
- **Booking Approval:** `supabase/migrations/013_booking_approval_automation.sql` Lines 32-68
- **Booking Cancellation:** `supabase/migrations/013_booking_approval_automation.sql` Lines 71-108
- **Message Broadcasting:** `supabase/migrations/007_realtime_messaging.sql` Lines 5-44

#### Edge Functions
- **Create Payment Intent:** `supabase/functions/create-payment-intent/index.ts` Lines 15-278
- **Stripe Webhook:** `supabase/functions/stripe-webhook/index.ts` Lines 20-141

#### Database Migrations
- **Initial Schema:** `supabase/migrations/001_initial_schema.sql`
- **RLS Policies:** `supabase/migrations/002_rls_policies.sql`
- **Booking Automation:** `supabase/migrations/013_booking_approval_automation.sql`
- **Payments Table:** `supabase/migrations/013c_create_payments_table.sql`
- **Performance Optimizations:** `supabase/migrations/016_booking_system_performance_optimizations.sql`
- **RLS Optimizations:** `supabase/migrations/017_rls_performance_optimizations.sql`
- **Policy Consolidation:** `supabase/migrations/019_consolidate_multiple_permissive_policies.sql`

---

## Summary

The RentAloo booking and payment system is a comprehensive, integrated solution that:

1. **Manages booking lifecycle** from request to completion
2. **Processes payments securely** via Stripe with escrow
3. **Facilitates communication** through real-time messaging
4. **Automates workflows** via database triggers
5. **Handles edge cases** with idempotency and error handling
6. **Provides real-time updates** via Supabase Realtime

The system is designed for reliability, security, and user experience, with proper error handling, idempotency checks, and automated workflows that reduce manual intervention while maintaining data integrity.

