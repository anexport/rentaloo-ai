# **EXECUTION PLAN: Payment-First Booking Flow**

**Created:** November 7, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation

## **Overview**
Transform the booking system from "Request → Owner Approval → Payment" to "Payment → Auto-Approved Booking". Payment success triggers automatic booking creation, conversation, and availability blocking.

---

## **PHASE 1: Database & Backend Changes**

### **Task 1.1: Modify Stripe Webhook to Auto-Create Booking**
**File:** `supabase/functions/stripe-webhook/index.ts`

**Current Flow:**
```
payment_intent.succeeded → Update payment status → Approve booking_request → Trigger creates booking
```

**New Flow:**
```
payment_intent.succeeded → Update payment status → Approve booking_request (status='approved') → Trigger creates booking + blocks availability
```

**Changes:**
- Keep the existing auto-approval in webhook (lines 88-98)
- This leverages existing trigger infrastructure
- No changes needed here since webhook already auto-approves

**Status:** ✅ No changes needed - already auto-approves on payment success

---

### **Task 1.2: Update Booking Request Creation Flow**
**File:** `src/components/booking/BookingRequestForm.tsx`

**Changes Required:**

**A. Remove conversation/message creation from form submission (lines 195-236)**
- Delete the conversation creation logic after booking creation
- Delete the initial message sending logic
- These will move to AFTER payment success

**B. Change success callback behavior**
- After booking_request created, immediately trigger payment flow
- Pass booking_request_id to parent component
- Parent will show payment form immediately

**C. Update button text**
- Change "Submit Request" to "Continue to Payment" or similar
- Or skip this form entirely and go straight to payment (see Task 2.1)

---

### **Task 1.3: Create Post-Payment Conversation Handler**
**File:** `supabase/functions/stripe-webhook/index.ts`

**Add After Payment Success (after line 98):**

```typescript
// After approving booking request, create conversation and send confirmation message
if (brId) {
  try {
    // Get booking request details
    const { data: bookingRequest } = await supabase
      .from("booking_requests")
      .select(`
        id,
        renter_id,
        start_date,
        end_date,
        total_amount,
        equipment:equipment(id, title, owner_id)
      `)
      .eq("id", brId)
      .single();

    if (bookingRequest && bookingRequest.equipment) {
      const ownerId = bookingRequest.equipment.owner_id;
      
      // Check if conversation exists for this booking
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("booking_request_id", brId)
        .maybeSingle();

      let conversationId = existingConv?.id;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            booking_request_id: brId,
            participants: [bookingRequest.renter_id, ownerId]
          })
          .select("id")
          .single();
        
        conversationId = newConv?.id;

        // Add conversation participants
        if (conversationId) {
          await supabase.from("conversation_participants").insert([
            { conversation_id: conversationId, profile_id: bookingRequest.renter_id },
            { conversation_id: conversationId, profile_id: ownerId }
          ]);
        }
      }

      // Send payment confirmation message
      if (conversationId) {
        const startDate = new Date(bookingRequest.start_date).toLocaleDateString();
        const endDate = new Date(bookingRequest.end_date).toLocaleDateString();
        
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: bookingRequest.renter_id,
          content: `Payment confirmed! I've booked your "${bookingRequest.equipment.title}" from ${startDate} to ${endDate} ($${bookingRequest.total_amount.toFixed(2)} total).`,
          message_type: "booking_approved"
        });
      }
    }
  } catch (convError) {
    console.error("Error creating conversation after payment:", convError);
    // Don't fail the webhook - booking is still valid
  }
}
```

---

## **PHASE 2: Frontend UI Changes**

### **Task 2.1: Modify BookingRequestForm Component**
**File:** `src/components/booking/BookingRequestForm.tsx`

**Option A (Simpler - Recommended for MVP):**
Keep two-step flow: Create booking_request → Show payment form

**Changes:**
1. **Remove conversation creation** (lines 195-236)
2. **Update submit handler:**
```typescript
const onSubmit = async (data: BookingFormData) => {
  if (!user || conflicts.length > 0) return;
  
  if (user.id === equipment.owner_id) {
    alert("You cannot book your own equipment.");
    return;
  }

  setIsSubmitting(true);

  try {
    const bookingData = {
      equipment_id: equipment.id,
      renter_id: user.id,
      start_date: data.start_date,
      end_date: data.end_date,
      total_amount: calculation?.total || 0,
      status: "pending" as const, // Still pending until payment
      message: data.message || null,
    };

    const { data: newBooking, error } = await supabase
      .from("booking_requests")
      .insert(bookingData)
      .select()
      .single();

    if (error) throw error;

    // Pass to parent to trigger payment
    onSuccess?.(newBooking.id);
  } catch (error) {
    console.error("Error creating booking request:", error);
    alert("Failed to submit booking request. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
```

3. **Update button text:**
```tsx
<Button type="submit" disabled={!canSubmit || isSubmitting}>
  {isSubmitting ? "Processing..." : "Continue to Payment"}
</Button>
```

4. **Update success message/flow:**
Parent component should immediately show PaymentForm after success

---


---

### **Task 2.2: Update Equipment Detail Page to Show Payment Immediately**
**File:** `src/pages/equipment/EquipmentDetail.tsx` (or wherever BookingRequestForm is used)

**Changes:**
1. Add state to track booking_request_id after form submission
2. Conditionally render PaymentForm when booking_request_id exists
3. Hide BookingRequestForm after payment form shows

**Example:**
```tsx
const [bookingRequestId, setBookingRequestId] = useState<string | null>(null);

// In component render:
{!bookingRequestId ? (
  <BookingRequestForm
    equipment={equipment}
    onSuccess={(id) => setBookingRequestId(id)}
  />
) : (
  <PaymentForm
    bookingRequestId={bookingRequestId}
    ownerId={equipment.owner_id}
    totalAmount={/* pass calculated amount */}
    onSuccess={() => navigate("/payment/confirmation?payment_id=...")}
    onCancel={() => {
      // Delete unpaid booking_request
      setBookingRequestId(null);
    }}
  />
)}
```

---

### **Task 2.3: Update BookingRequestCard - Remove Approval Buttons**
**File:** `src/components/booking/BookingRequestCard.tsx`

**Changes:**

**A. Remove owner approval actions (lines 139-210):**
- Remove "Approve" button logic
- Remove "Decline" button logic
- Keep "Cancel" functionality for owner cancellations with refund

**B. Update UI based on payment status:**
```tsx
// Show payment status prominently
{bookingRequest.status === "pending" && !hasPayment && (
  <Badge variant="warning">Awaiting Payment</Badge>
)}

{bookingRequest.status === "approved" && hasPayment && (
  <Badge variant="success">Booking Confirmed</Badge>
)}
```

**C. Remove "Pay Now" button for approved bookings:**
Since payment must happen first, there's no scenario where approved booking has no payment

**D. Update cancel logic to trigger refund:**
When owner/renter cancels, call refund endpoint (if you implement it)

---

### **Task 2.4: Update Payment Confirmation Page**
**File:** `src/pages/payment/PaymentConfirmation.tsx`

**Changes:**
Update messaging to reflect that booking is automatically confirmed:

```tsx
<Alert variant="success">
  <CheckCircle className="h-5 w-5" />
  <AlertDescription>
    Payment successful! Your booking is confirmed and the owner has been notified.
  </AlertDescription>
</Alert>
```

---

## **PHASE 3: Race Condition Handling (First Payment Wins)**

### **Task 3.1: Add Availability Check in Payment Intent Creation**
**File:** `supabase/functions/create-payment-intent/index.ts`

**Add Before Creating PaymentIntent (after line 103):**

```typescript
// Check availability one more time before creating payment intent
// This prevents race conditions where multiple users try to book same dates
const { data: conflictCheck } = await supabase.rpc(
  "check_booking_conflicts",
  {
    p_equipment_id: (br.equipment as { id: string }).id,
    p_start_date: br.start_date,
    p_end_date: br.end_date,
    p_exclude_booking_id: null
  }
);

if (conflictCheck === false) {
  return new Response(
    JSON.stringify({ 
      error: "These dates are no longer available. Please select different dates." 
    }),
    {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
```

**Note:** This doesn't completely solve race conditions but reduces the window. For true prevention, would need database-level locking (more complex).

---

### **Task 3.2: Handle Payment Failure - Keep Dates Available**
**File:** No changes needed

**Current behavior:**
- Booking request status stays "pending"
- Trigger only fires on status="approved"
- Dates remain available until payment succeeds

**This already works correctly! ✅**

---

## **PHASE 4: Owner Cancellation with Auto-Refund**

### **Task 4.1: Implement Refund Endpoint (Optional for MVP)**
**File:** `supabase/functions/process-refund/index.ts`

**Status:** This function already exists in your codebase!

**Usage:** When owner cancels, call this function to process refund

---

### **Task 4.2: Update BookingRequestCard Cancel Handler**
**File:** `src/components/booking/BookingRequestCard.tsx`

**Modify handleStatusUpdate for cancellation (around line 139):**

```typescript
const handleStatusUpdate = async (
  newStatus: "cancelled"
) => {
  if (!user) return;

  const confirmed = window.confirm(
    isOwner 
      ? "Are you sure you want to cancel this booking? The renter will receive a full refund."
      : "Are you sure you want to cancel this booking? You will receive a full refund."
  );
  if (!confirmed) return;

  setIsUpdating(true);

  try {
    // If there's a successful payment, trigger refund
    if (hasPayment) {
      // Call refund endpoint
      const { data: payment } = await supabase
        .from("payments")
        .select("id, stripe_payment_intent_id")
        .eq("booking_request_id", bookingRequest.id)
        .eq("payment_status", "succeeded")
        .single();

      if (payment) {
        // TODO: Call process-refund function
        // For now, just update status - implement refund later
        console.log("Refund needed for payment:", payment.id);
      }
    }

    // Update booking status to cancelled
    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingRequest.id);

    if (error) throw error;

    // Send cancellation message
    const otherUserId = isOwner
      ? bookingRequest.renter_id
      : bookingRequest.owner.id;

    const conversation = await getOrCreateConversation(
      [otherUserId],
      bookingRequest.id
    );

    if (conversation) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: `Booking has been cancelled. ${hasPayment ? "A full refund will be processed." : ""}`,
        message_type: "booking_cancelled",
      });
    }

    onStatusChange?.();
  } catch (error) {
    console.error("Error cancelling booking:", error);
    alert("Failed to cancel booking. Please try again.");
  } finally {
    setIsUpdating(false);
  }
};
```

**Remove "Approve" and "Decline" actions - only keep "Cancel"**

---

## **PHASE 5: UI/UX Polish**

### **Task 5.1: Update Button Labels**
**Files to update:**
- `src/components/booking/BookingRequestForm.tsx` - "Continue to Payment"
- Equipment detail pages - "Book & Pay Now"
- Any other booking CTAs

### **Task 5.2: Update Status Badges**
**File:** `src/lib/booking.ts`

Update `getBookingStatusText()`:
```typescript
export const getBookingStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Awaiting Payment",
    approved: "Confirmed", // Changed from "Approved"
    declined: "Declined",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return statusMap[status] || status;
};
```

### **Task 5.3: Update Help Text/Tooltips**
Remove references to "owner approval" throughout the UI:
- Equipment detail page
- Booking forms
- Help sections
- FAQ (if exists)

---

## **PHASE 6: Error Handling & Edge Cases**

### **Task 6.1: Handle Webhook Conversation Creation Failures**
**Status:** ✅ Already handled in Task 1.3 (try-catch with console.error, doesn't fail webhook)

### **Task 6.2: Handle Failed Booking Request Cleanup**
**Recommendation:** Add cleanup job to delete old "pending" booking_requests with no payment after 30 minutes

**File:** Create `supabase/functions/cleanup-unpaid-bookings/index.ts` (optional for MVP)

### **Task 6.3: Update Error Messages**
Search codebase for approval-related error messages and update:
- "Waiting for owner approval" → "Awaiting payment"
- "Owner declined" → N/A (remove these paths)

---

## **PHASE 7: Testing Checklist**

### **Critical User Flows to Test:**

1. **Happy Path:**
   - [ ] Select equipment → Pick dates → See price → Pay → Booking auto-created
   - [ ] Conversation created with payment confirmation message
   - [ ] Availability calendar blocked
   - [ ] Both renter and owner receive notification

2. **Payment Failure:**
   - [ ] Dates remain available
   - [ ] User can retry payment
   - [ ] Booking request stays "pending"

3. **Race Condition:**
   - [ ] User A books dates 1-5
   - [ ] User B tries to book dates 3-7 simultaneously
   - [ ] Second payment fails with "dates unavailable" error

4. **Cancellation:**
   - [ ] Owner cancels paid booking
   - [ ] Refund initiated (or logged for manual processing)
   - [ ] Dates become available again
   - [ ] Cancellation message sent

5. **Edge Cases:**
   - [ ] User tries to book own equipment
   - [ ] Payment succeeds but conversation creation fails (should still complete)
   - [ ] Webhook retries (idempotency check works)

---

## **PHASE 8: Database Migration (Optional)**

### **Task 8.1: Clean Up Old Pending Bookings**
Before deploying, decide what to do with existing "pending" bookings:

**Option A:** Leave them as-is (they'll stay pending until paid)
**Option B:** Cancel them with notification
**Option C:** Give owners X days to manually approve/decline

**Recommendation for MVP:** Option A (least disruptive)

---

## **IMPLEMENTATION ORDER (Priority)**

### **Sprint 1 - Core Flow (MVP)**
1. ✅ Task 1.3 - Add conversation creation to webhook
2. ✅ Task 2.1 - Remove conversation from BookingRequestForm
3. ✅ Task 2.2 - Update Equipment page to show payment immediately
4. ✅ Task 5.1 - Update button text to "Book & Pay Now"
5. ✅ Task 5.2 - Update status text

### **Sprint 2 - Owner Experience**
6. ✅ Task 2.3 - Update BookingRequestCard (remove approve/decline)
7. ✅ Task 4.2 - Add cancellation with refund notice

### **Sprint 3 - Safety & Polish**
8. ✅ Task 3.1 - Add availability check in payment intent
9. ✅ Task 5.3 - Update help text
10. ✅ Task 2.4 - Update payment confirmation page

### **Future Enhancements (Post-MVP)**
- Automatic refund processing (Task 4.1)
- Cleanup job for unpaid bookings (Task 6.2)
- Database migration for old bookings (Task 8.1)

---

## **Key Files to Modify - Summary**

| File | Changes | Priority |
|------|---------|----------|
| `supabase/functions/stripe-webhook/index.ts` | Add conversation creation after payment | **HIGH** |
| `src/components/booking/BookingRequestForm.tsx` | Remove conversation logic, update button text | **HIGH** |
| `src/pages/equipment/EquipmentDetail.tsx` | Show payment form immediately after booking | **HIGH** |
| `src/components/booking/BookingRequestCard.tsx` | Remove approve/decline, update cancel logic | **HIGH** |
| `supabase/functions/create-payment-intent/index.ts` | Add availability check before payment | **MEDIUM** |
| `src/lib/booking.ts` | Update status text | **MEDIUM** |
| `src/pages/payment/PaymentConfirmation.tsx` | Update messaging | **LOW** |

---

## **Risks & Mitigations**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition (double booking) | **HIGH** | Availability check in payment intent (Task 3.1) |
| Payment succeeds but booking fails | **MEDIUM** | Webhook error handling + manual review |
| Owner unhappy with auto-approval | **MEDIUM** | Allow cancellation with refund |
| Conversation creation fails | **LOW** | Already handled with try-catch |

---

## **READY TO EXECUTE**

This plan is complete and ready for implementation. Start with Sprint 1 tasks in order. Each task is isolated and can be tested independently.

**Estimated effort:** 
- Sprint 1: 4-6 hours
- Sprint 2: 2-3 hours  
- Sprint 3: 2-3 hours

**Total: 8-12 hours for full MVP implementation**

---

## **Decision Log**

**Requirements Confirmed:**
1. Payment-first flow (user pays before booking created)
2. No owner approval needed (auto-approve on payment)
3. Availability blocked immediately after payment succeeds
4. Conversation created after payment with confirmation message
5. Owner can cancel with automatic refund notification
6. Button text: "Book & Pay Now"
7. Keep `booking_requests` table, auto-set to "approved" on payment
8. First payment wins for race conditions (simpler MVP approach)
9. Dates remain available on payment failure with retry option
10. Keep webhook auto-approval pattern (leverage existing triggers)

**Date:** November 7, 2025
