# Payment System Implementation Summary

## Overview
This document provides a comprehensive summary of the current payment system implementation, including database schema, functions, triggers, RLS policies, and frontend components.

---

## 📊 Database Schema

### Payments Table (`payments`)
Created in migration: `20251029063013_create_payments_table`

**Core Fields:**
- `id` (UUID, Primary Key)
- `booking_request_id` (UUID, FK → `booking_requests`)
- `renter_id` (UUID, FK → `profiles`)
- `owner_id` (UUID, FK → `profiles`)

**Stripe Integration Fields:**@
- `stripe_payment_intent_id` (TEXT, UNIQUE)
- `stripe_charge_id` (TEXT)
- `stripe_transfer_id` (TEXT)
- `payment_method_id` (TEXT)

**Amount Fields:**
- `subtotal` (DECIMAL 10,2) - Base rental cost
- `service_fee` (DECIMAL 10,2, DEFAULT 0) - 5% platform fee
- `tax` (DECIMAL 10,2, DEFAULT 0) - Tax amount (currently 0%)
- `total_amount` (DECIMAL 10,2) - Total payment amount
- `escrow_amount` (DECIMAL 10,2) - Amount held in escrow
- `owner_payout_amount` (DECIMAL 10,2) - Amount owner receives

**Status Fields:**
- `payment_status` (TEXT, DEFAULT 'pending')
  - Allowed: `pending`, `processing`, `succeeded`, `failed`, `refunded`, `cancelled`
- `escrow_status` (TEXT, DEFAULT 'held')
  - Allowed: `held`, `released`, `refunded`, `disputed`
- `payout_status` (TEXT, DEFAULT 'pending')
  - Allowed: `pending`, `processing`, `completed`, `failed`

**Refund Fields:**
- `refund_amount` (DECIMAL 10,2, DEFAULT 0)
- `refund_reason` (TEXT)

**Metadata:**
- `currency` (TEXT, DEFAULT 'usd')
- `failure_reason` (TEXT)
- `escrow_released_at` (TIMESTAMPTZ)
- `payout_processed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- `valid_amounts`: `total_amount = subtotal + service_fee + tax`
- `valid_escrow`: `escrow_amount <= total_amount`
- `valid_payout`: `owner_payout_amount <= escrow_amount`

**Indexes:**
- `idx_payments_booking_request` on `booking_request_id`
- `idx_payments_renter` on `renter_id`
- `idx_payments_owner` on `owner_id`
- `idx_payments_status` on `payment_status`
- `idx_payments_escrow_status` on `escrow_status`
- `idx_payments_payout_status` on `payout_status`
- `idx_payments_created_at` on `created_at DESC`
- `idx_payments_status_created_at` on `(payment_status, created_at DESC)` (from migration 016)

---

## 🔧 Database Functions

### 1. `sync_payment_status_to_booking()`
**Purpose:** Automatically syncs payment status to the `bookings` table when payment status changes.

**Type:** Trigger Function (SECURITY DEFINER)

**Logic:**
- On INSERT or UPDATE of `payment_status` in `payments` table
- Updates `bookings.payment_status` to match `payments.payment_status`
- Uses `booking_request_id` to link records

**Created in:** Migration `015_booking_system_medium_priority_fixes`

**Trigger:**
- Name: `trigger_sync_payment_status`
- Event: AFTER INSERT OR UPDATE OF `payment_status` ON `payments`
- Timing: AFTER

### 2. `update_payments_updated_at()`
**Purpose:** Automatically updates the `updated_at` timestamp when payment records are modified.

**Type:** Trigger Function

**Logic:**
- Sets `NEW.updated_at = NOW()` before UPDATE

**Trigger:**
- Name: `payments_updated_at_trigger`
- Event: BEFORE UPDATE ON `payments`
- Timing: BEFORE

---

## 🔐 Row Level Security (RLS) Policies

### SELECT Policy
**Policy Name:** "Authenticated users can view payments"
- **Roles:** `authenticated`
- **Logic:** 
  - Renters can view payments where they are the renter
  - Owners can view payments where they own the equipment
  - Uses EXISTS subqueries through `booking_requests` table
- **Consolidated in:** Migration `019_consolidate_multiple_permissive_policies`

### INSERT Policy
**Policy Name:** "System can create payments"
- **Roles:** `public`
- **Logic:** Allows any authenticated user to create payments (handled by backend)

### UPDATE Policy
**Policy Name:** "System can update payments"
- **Roles:** `public`
- **Logic:** Allows any authenticated user to update payments (handled by backend)

---

## 🎨 Frontend Components

### 1. Payment Hook (`usePayment.ts`)
**Location:** `src/hooks/usePayment.ts`

**Functions:**
- `createPayment()` - Creates payment and holds funds in escrow
- `getPayment()` - Fetches payment details with relations
- `getUserPayments()` - Gets all payments for a user (renter/owner)
- `processRefund()` - Processes refunds
- `releaseEscrow()` - Releases escrow funds to owner
- `getEscrowBalance()` - Calculates total escrow balance for owner
- `canReleaseEscrow()` - Checks if escrow can be released

**Current Status:** Uses mock Stripe integration (commented TODOs for production)

### 2. Payment Utilities (`lib/payment.ts`)
**Location:** `src/lib/payment.ts`

**Functions:**
- `calculatePaymentSummary()` - Calculates breakdown (subtotal, fees, tax, total, escrow, payout)
- `formatCurrency()` - Formats currency for display
- `getPaymentStatusText()` / `getPaymentStatusColor()` - Status display helpers
- `getEscrowStatusText()` / `getEscrowStatusColor()` - Escrow status helpers
- `formatTransactionDate()` - Date formatting
- `isValidPaymentAmount()` - Amount validation
- `calculateRefundAmount()` - Refund calculation based on cancellation policy
- `canReleaseEscrow()` - Checks if rental is complete and escrow can be released

**Service Fee:** 5% (default)
**Tax:** 0% (for MVP)

### 3. Stripe Integration (`lib/stripe.ts`)
**Location:** `src/lib/stripe.ts`

**Current Status:** ⚠️ **MOCK IMPLEMENTATION**

**Functions:**
- `getStripe()` - Returns Stripe instance (singleton)
- `createPaymentIntent()` - **MOCK** - Creates payment intent
- `confirmPayment()` - Confirms payment with Stripe
- `formatAmountForStripe()` / `formatAmountFromStripe()` - Amount conversion

**TODO:** Implement backend API endpoints for:
- Creating payment intents
- Confirming payments
- Processing refunds
- Transferring funds to owners

### 4. UI Components

#### PaymentForm (`components/payment/PaymentForm.tsx`)
- Form for collecting payment information
- **Current:** Mock payment processing (2s delay simulation)
- **TODO:** Integrate with Stripe Elements for card collection

#### PaymentModal (`components/payment/PaymentModal.tsx`)
- Modal wrapper for PaymentForm
- Handles open/close states and animations

#### PaymentSummary (`components/payment/PaymentSummary.tsx`)
- Displays payment breakdown (subtotal, fees, tax, total)
- Shows escrow and payout information for owners

#### EscrowDashboard (`components/payment/EscrowDashboard.tsx`)
- Owner dashboard for managing escrow payments
- Shows:
  - Total in escrow
  - Held funds count
  - Released funds count
  - List of escrow payments with details

#### EscrowStatus (`components/payment/EscrowStatus.tsx`)
- Component for displaying and managing escrow status
- Allows releasing escrow funds

#### TransactionHistory (`components/payment/TransactionHistory.tsx`)
- Displays transaction history for renters/owners
- Filtering by status (all, succeeded, pending)
- **TODO:** Receipt download functionality

#### PaymentConfirmation (`pages/payment/PaymentConfirmation.tsx`)
- Confirmation page after successful payment

---

## 📋 Payment Flow

### Current Flow (MVP - Mock)
1. Renter initiates booking request
2. Owner approves booking request
3. Renter clicks "Pay Now" → Opens PaymentModal
4. PaymentForm collects payment info (mock)
5. `usePayment.createPayment()` is called:
   - Calculates payment summary
   - **MOCK:** Inserts payment record with `payment_status = 'succeeded'`
   - **MOCK:** Sets `stripe_payment_intent_id` to mock value
   - Updates `booking_request.status` to `approved`
   - Creates `booking` record (via trigger from migration 013)
6. Trigger `sync_payment_status_to_booking()` updates `bookings.payment_status`
7. Redirects to confirmation page

### Production Flow (TODO)
1. Renter initiates booking request
2. Owner approves booking request
3. Renter clicks "Pay Now" → Opens PaymentModal
4. PaymentForm uses Stripe Elements to collect card details
5. Frontend calls backend API to create Stripe Payment Intent
6. Backend creates Payment Intent via Stripe API
7. Frontend confirms payment with Stripe
8. Backend webhook receives payment confirmation
9. Backend creates payment record in Supabase
10. Escrow holds funds until rental completion
11. After rental completion, owner can release escrow
12. Backend creates Stripe Transfer to owner's connected account
13. Escrow status updated to `released`

---

## ⚠️ Missing Implementation

### Backend Integration
- ❌ No Supabase Edge Functions for payment processing
- ❌ No backend API endpoints for Stripe integration
- ❌ No Stripe webhook handlers
- ❌ No Stripe Connect integration for owner payouts
- ❌ No payment method storage/management

### Stripe Integration
- ❌ Real Stripe Payment Intent creation
- ❌ Real Stripe payment confirmation
- ❌ Stripe refund processing
- ❌ Stripe Transfer to owner accounts
- ❌ Stripe webhook handling for payment events

### Features
- ❌ Payment method saving for future use
- ❌ Automatic escrow release after rental completion
- ❌ Refund processing with Stripe
- ❌ Receipt generation and download
- ❌ Email notifications for payment events
- ❌ Dispute handling workflow

### Database
- ❌ No payment method storage table
- ❌ No webhook events log table
- ❌ No payout requests table (if needed)
- ❌ No refunds table (if tracking separately)

---

## ✅ What's Working

### Database
- ✅ Complete payments table schema
- ✅ Proper indexes for performance
- ✅ RLS policies for security
- ✅ Automatic status sync between payments and bookings
- ✅ Automatic timestamp updates

### Frontend
- ✅ Payment calculation utilities
- ✅ Payment form UI
- ✅ Escrow dashboard for owners
- ✅ Transaction history display
- ✅ Payment summary display
- ✅ Status badges and colors
- ✅ Mock payment flow (for testing UI)

### Business Logic
- ✅ Payment summary calculation (5% service fee)
- ✅ Escrow amount calculation
- ✅ Owner payout calculation
- ✅ Refund calculation based on cancellation policy
- ✅ Escrow release eligibility check

---

## 🚀 Next Steps for Production

### Phase 1: Backend Setup
1. Create Supabase Edge Functions:
   - `create-payment-intent` - Create Stripe Payment Intent
   - `confirm-payment` - Confirm payment with Stripe
   - `process-refund` - Process refunds
   - `release-escrow` - Release escrow to owner
   - `stripe-webhook` - Handle Stripe webhooks

2. Set up Stripe Connect:
   - Onboard owners as Stripe Connect accounts
   - Store connected account IDs in `owner_profiles` table
   - Implement payout flow

### Phase 2: Frontend Integration
1. Integrate Stripe Elements:
   - Replace mock payment form with Stripe Card Element
   - Add payment method selection
   - Add saved payment methods display

2. Connect to backend APIs:
   - Replace mock `createPaymentIntent()` with API call
   - Replace mock `createPayment()` with real Stripe flow
   - Add error handling for payment failures

### Phase 3: Advanced Features
1. Automation:
   - Auto-release escrow after rental completion
   - Scheduled checks for completed rentals
   - Email notifications

2. Additional Features:
   - Receipt generation
   - Payment method management
   - Refund request workflow
   - Dispute resolution system

---

## 📝 Notes

- All payment amounts are stored in `DECIMAL(10,2)` format
- Currency is currently hardcoded to `USD`
- Service fee is 5% (configurable in `calculatePaymentSummary`)
- Tax is 0% for MVP (can be added later)
- Refund policy: 100% if 7+ days before, 50% if 3-6 days, 0% if <3 days
- Escrow can be released 1 day after rental end date (configurable)

---

## 🔗 Related Tables

- `booking_requests` - Links payments to booking requests
- `bookings` - Payment status synced to this table
- `profiles` - Renter and owner information
- `equipment` - Equipment being rented (for owner lookup)

---

*Last Updated: Based on current codebase state*
*Database Migrations: Up to migration 019*

