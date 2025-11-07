# Booking Request Flow - Quick Reference

## State Transitions at a Glance

```
PENDING → (payment) → APPROVED → (rental complete) → COMPLETED
   ↓                      ↓
CANCELLED          CANCELLED
```

## Key Files Reference

### Components
| Component | Path | Purpose |
|-----------|------|---------|
| BookingRequestForm | `src/components/booking/BookingRequestForm.tsx` | Create new booking requests |
| BookingRequestCard | `src/components/booking/BookingRequestCard.tsx` | Display & manage bookings |
| PaymentForm | `src/components/payment/PaymentForm.tsx` | Process payments |
| PaymentSummary | `src/components/payment/PaymentSummary.tsx` | Show payment breakdown |
| EscrowStatus | `src/components/payment/EscrowStatus.tsx` | Display escrow status |

### Hooks
| Hook | Path | Purpose |
|------|------|---------|
| useBookingRequests | `src/hooks/useBookingRequests.ts` | Fetch & manage bookings |
| usePayment | `src/hooks/usePayment.ts` | Payment operations |

### Utilities
| Function | Path | Purpose |
|----------|------|---------|
| calculateBookingTotal | `src/lib/booking.ts` | Calculate rental costs |
| checkBookingConflicts | `src/lib/booking.ts` | Check date availability |
| calculatePaymentSummary | `src/lib/payment.ts` | Payment breakdown |

### Database
| Migration | Path | Purpose |
|-----------|------|---------|
| 001_initial_schema | `supabase/migrations/001_initial_schema.sql` | Core tables |
| 013c_create_payments | `supabase/migrations/013c_create_payments_table.sql` | Payment system |
| 016_performance | `supabase/migrations/016_booking_system_performance_optimizations.sql` | Indexes |

## Booking Request Fields

```typescript
{
  id: UUID
  equipment_id: UUID          // Which equipment
  renter_id: UUID             // Who is renting
  start_date: DATE            // Rental start
  end_date: DATE              // Rental end
  total_amount: DECIMAL       // Total cost
  status: booking_status      // pending/approved/cancelled/completed
  message: TEXT               // Optional note to owner
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## Payment Record Fields

```typescript
{
  id: UUID
  booking_request_id: UUID
  renter_id: UUID
  owner_id: UUID
  subtotal: DECIMAL           // Base rental cost
  service_fee: DECIMAL        // Platform fee (5%)
  tax: DECIMAL                // Applicable taxes
  total_amount: DECIMAL       // Total charged
  escrow_amount: DECIMAL      // Held in escrow
  owner_payout_amount: DECIMAL // Owner receives
  payment_status: payment_status
  escrow_status: escrow_status
  stripe_payment_intent_id: TEXT
  currency: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## Status Values

### booking_status
- `pending` - Request created, awaiting payment
- `approved` - Payment received, booking confirmed
- `cancelled` - Cancelled by renter or owner
- `completed` - Rental finished, escrow released

### payment_status
- `pending` - Payment initiated
- `succeeded` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

### escrow_status
- `held` - Funds held in escrow
- `released` - Funds released to owner
- `refunded` - Funds refunded to renter

## Price Calculation

```javascript
const daily_rate = equipment.daily_rate;
const days = Math.ceil((endDate - startDate) / (1000*60*60*24));
const subtotal = daily_rate * days;
const service_fee = subtotal * 0.05;  // 5%
const total = subtotal + service_fee;
```

## Common Queries

### Get Renter's Bookings
```sql
SELECT * FROM booking_requests
WHERE renter_id = $user_id
ORDER BY created_at DESC;
```

### Get Owner's Pending Requests
```sql
SELECT br.* 
FROM booking_requests br
JOIN equipment e ON e.id = br.equipment_id
WHERE e.owner_id = $user_id
AND br.status = 'pending'
ORDER BY br.created_at DESC;
```

### Check Date Availability
```sql
SELECT check_booking_conflicts(
  p_equipment_id := $equipment_id,
  p_start_date := $start_date,
  p_end_date := $end_date,
  p_exclude_booking_id := NULL
);
```

## User Flows

### Renter Journey
1. Browse equipment → ExplorePage
2. Select dates → BookingRequestForm
3. Submit request → Creates booking_request
4. Pay → PaymentForm
5. Wait for rental period
6. Return equipment
7. Leave review

### Owner Journey
1. List equipment → EquipmentManagement
2. Receive booking request → Notification
3. View request → OwnerDashboard
4. (Automatic approval via payment)
5. Hand over equipment
6. Receive equipment back
7. Receive payout → Escrow released
8. Leave review

## API Endpoints (Supabase)

### Tables
- `booking_requests` - All booking requests
- `payments` - Payment records
- `equipment` - Equipment listings
- `profiles` - User profiles
- `categories` - Equipment categories
- `reviews` - User reviews

### RPC Functions
- `check_booking_conflicts` - Check date availability

### Real-time Channels
- `payment-{bookingRequestId}` - Payment updates
- `booking-{bookingRequestId}` - Booking status updates

## Validation Rules

### Dates
- ✓ End date > Start date
- ✓ Start date >= Today
- ✓ Duration >= 1 day
- ✓ Duration <= 30 days
- ✓ No overlapping bookings

### Authorization
- ✗ Cannot book own equipment
- ✓ Must be authenticated
- ✓ Owner can view bookings for their equipment
- ✓ Renter can view their bookings

### Payment
- ✓ Total amount must match calculation
- ✓ Payment must succeed before approval
- ✓ Escrow held until completion
- ✓ Refunds processed on cancellation

## Troubleshooting

### Booking Not Created
- Check: User authenticated?
- Check: Valid dates?
- Check: Not own equipment?
- Check: No conflicts?

### Payment Failed
- Check: Payment method valid?
- Check: Sufficient funds?
- Check: Stripe webhook configured?
- Check: Network connection?

### Escrow Not Released
- Check: Booking status = 'completed'?
- Check: Webhook processed?
- Check: Database trigger executed?

## Key Indexes for Performance

```sql
-- Owner dashboard queries
idx_booking_requests_equipment_status_created

-- Renter dashboard queries
idx_booking_requests_renter_status_created

-- Conflict detection
idx_booking_requests_conflict_check

-- Payment lookups
idx_payments_booking_request_id
idx_payments_status_created_at
```

## Webhook Events

### Stripe Webhooks
- `payment_intent.succeeded` → Create payment record
- `payment_intent.failed` → Mark payment failed
- `charge.refunded` → Process refund

### Expected Response
- Status: 200 OK
- Body: `{"received": true}`

## Environment Variables

```env
VITE_SUPABASE_URL=          # Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anon key
VITE_STRIPE_PUBLISHABLE_KEY= # Stripe public key
```

## Testing Scenarios

### Happy Path
1. Create request ✓
2. Process payment ✓
3. Confirm booking ✓
4. Complete rental ✓
5. Release escrow ✓
6. Submit reviews ✓

### Error Cases
1. Invalid dates → Show validation error
2. Conflicting dates → Show conflict message
3. Payment declined → Retry payment
4. Webhook failure → Manual intervention
5. Cancel booking → Process refund

## Metrics to Monitor

- Booking request creation rate
- Payment success rate
- Average booking value
- Cancellation rate
- Time to payment completion
- Escrow release time
- Review submission rate

## Support Resources

- Main Documentation: `docs/booking-request-flow.md`
- Payment Guide: `docs/payments/stripe-test-payment-implementation.md`
- Database Guide: `supabase/guides/RLSPolicies.md`
- README: `README.md`
