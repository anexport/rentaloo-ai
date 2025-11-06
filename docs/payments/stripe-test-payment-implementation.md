# Stripe Test Payments — Implementation Plan (MVP)

Audience: AI executor implementing Stripe test-mode card payments in this repo.
Scope: Test payments only (Stripe test cards). No real payouts/Connect yet.

---

## Context Snapshot (from codebase)

- Frontend framework: React + Vite + TypeScript
- Auth/DB: Supabase (client in `src/lib/supabase.ts`)
- Payment UI: Present and mocked
  - `src/components/payment/PaymentForm.tsx` — collects card details manually (mock), calls `usePayment.createPayment()` to write payments in DB directly
  - `src/components/payment/PaymentModal.tsx` and usage in `src/components/booking/BookingRequestCard.tsx`
  - `src/pages/payment/PaymentConfirmation.tsx` — reads from `payments` table and renders confirmation
- Payment logic
  - `src/hooks/usePayment.ts` — currently inserts into `payments` (mock), updates booking state; processes refunds/releases in DB only
  - `src/lib/stripe.ts` — loads Stripe.js; `createPaymentIntent()` is mocked; `confirmPayment()` uses `stripe.confirmCardPayment`
  - `src/lib/payment.ts` — calculates breakdown, formatting, helpers
- DB
  - `payments` table is present in `src/lib/database.types.ts` (fields match summary doc)
  - Migrations reference `payments` triggers/policies; table creation migration is not present in repo, but types are prepared

Important: For this MVP, replace the mock flow with a real Stripe Payment Intent + Stripe Elements, and persist via webhook. Do not implement Connect/payouts yet.

---

## Goals

- Renter submits a booking request, immediately proceeds to payment using Stripe test cards.
- Create a Stripe Payment Intent on the backend with correct amount and metadata.
- Confirm payment client-side via Stripe Elements.
- On webhook confirmation, persist/update `payments` in Supabase and mark the booking request as `approved` so the booking is created (via existing trigger).
- Redirect to confirmation page using the stored payment id.

Non-goals (for now)
- Owner payouts or Stripe Connect
- True “escrow” mechanics (use DB status to represent held funds only)
- Refunds/disputes automation

---

## Decided Inputs (from product)

- Backend: Supabase Edge Functions (Deno) for endpoints and webhooks
- Currency: USD (test mode)
- Flow: Pay immediately after creating booking request; successful payment makes the booking go through (status becomes `approved`)
- Enforce: One successful payment per booking request
- Dev: Use Stripe CLI for webhook forwarding locally
- Refunds: Include a refund endpoint using Stripe Refunds API
- DB: If the `payments` table migration is missing, executor may add it/patch schema as needed

---

## Environment & Secrets

Frontend (.env for Vite):
- `VITE_STRIPE_PUBLISHABLE_KEY` = Stripe test publishable key
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` already required by app

Supabase Edge Functions (secrets):
- `STRIPE_SECRET_KEY` = Stripe test secret key
- `STRIPE_WEBHOOK_SECRET` = Secret from the webhook endpoint configured in Stripe dashboard or via Stripe CLI
- `SUPABASE_URL` = Same as frontend
- `SUPABASE_SERVICE_ROLE_KEY` = Service role key (for RLS-bypassing writes in functions)

Notes:
- Use Stripe test keys only for this MVP.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

---

## Backend (Supabase Edge Functions)

We’ll implement three functions for the MVP:
- `create-payment-intent` (authenticated) — Returns a client secret for a booking.
- `stripe-webhook` (unauthenticated, Stripe-signed) — Persists payment status; approves booking on success.
- `process-refund` (authenticated) — Creates a Stripe refund and updates payment row (full refund for MVP).

General Deno patterns:
- Import Stripe via ESM for Deno: `import Stripe from "https://esm.sh/stripe@13.x?target=deno"`
- Get raw request body for webhook signature: `await req.text()`
- Create Supabase client with service role and pass through the user token to validate the caller

1) create-payment-intent
- Path: `supabase/functions/create-payment-intent/index.ts`
- Method: POST
- Auth: Required. Read `Authorization: Bearer <access_token>` from request
- Input JSON: `{ bookingRequestId: string }`
- Steps:
  - Verify JWT via Supabase: `supabase.auth.getUser()`
- Load the booking request; verify caller is the renter. Status can be `pending` (preferred) or `approved`.
  - Enforce idempotency: check `payments` table for any `succeeded` row for this `booking_request_id`. If exists, return 409/meaningful error. If a `pending` row exists with `stripe_payment_intent_id`, attempt to retrieve its client secret from Stripe; if retrievable and not canceled, reuse it
  - Recalculate breakdown using same logic as `calculatePaymentSummary(subtotal)` where `subtotal = booking_request.total_amount`
  - Create Payment Intent via Stripe with:
    - `amount` in cents (from total), `currency: 'usd'`
    - `metadata`: `{ booking_request_id, renter_id, owner_id }`
  - Upsert a `payments` row with `payment_status = 'pending'`, `escrow_status = 'held'`, amounts, and `stripe_payment_intent_id`
  - Return `{ clientSecret, paymentIntentId }`

2) stripe-webhook
- Path: `supabase/functions/stripe-webhook/index.ts`
- Method: POST
- Auth: None; verify Stripe signature header `stripe-signature`
- Events to handle minimally:
  - `payment_intent.succeeded` → mark `payments.payment_status = 'succeeded'`, set `stripe_charge_id` if available from latest charge, keep `escrow_status = 'held'`
  - `payment_intent.payment_failed` → mark `payment_status = 'failed'`, set `failure_reason`
- Steps:
  - Verify signature using `STRIPE_WEBHOOK_SECRET`
  - Parse the `PaymentIntent` object; read metadata `{ booking_request_id, renter_id, owner_id }`
  - Upsert into `payments` using `stripe_payment_intent_id` as a unique reference; do not create duplicate rows
  - Optional: Update `bookings.payment_status` is already handled by trigger referenced in docs
  - Return 200 quickly; log errors carefully

Security notes:
- Use `SUPABASE_SERVICE_ROLE_KEY` in functions for DB writes; never send it to the client
- In `create-payment-intent`, verify the authenticated user is the renter on the booking request

---

## Frontend Changes

Summary: Replace manual card inputs in `PaymentForm.tsx` with Stripe Elements. Call the Edge Function to get a client secret, then confirm the payment with Stripe.

1) Update `src/lib/stripe.ts`
- Implement `createPaymentIntent(amount, bookingRequestId, metadata)` to call Supabase Edge Function:
  - URL: `"/functions/v1/create-payment-intent"`
  - Include `Authorization: Bearer <access_token>` from `supabase.auth.getSession()`
  - Body: `{ bookingRequestId }` (amount recalculated server-side)
  - Response: `{ clientSecret, paymentIntentId }`
- Keep `getStripe()` as-is, using `VITE_STRIPE_PUBLISHABLE_KEY`

2) Refactor `src/components/payment/PaymentForm.tsx`
- Replace the custom form inputs with Stripe Elements
  - Import `{ Elements, useStripe, useElements, PaymentElement, CardElement }` from `@stripe/react-stripe-js`
  - Decide either `PaymentElement` (recommended) or `CardElement` for MVP
- On mount / on open:
  - Call the Edge Function to create/reuse a Payment Intent and retrieve `clientSecret`
  - Wrap the form with `<Elements stripe={await getStripe()} options={{ clientSecret }}>`
- On submit:
  - Call `stripe.confirmPayment({ elements, confirmParams: { /* optional return_url */ }, redirect: 'if_required' })`
  - If error, surface in UI
  - If success, wait for webhook to persist the payment row (polling):
    - Poll Supabase (up to ~10s with backoff) by `stripe_payment_intent_id` to fetch the `payments` row
    - Navigate to `/payment/confirmation?payment_id=<id>`

3) Do not insert into `payments` from the client
- Remove or bypass the direct insert logic in `usePayment.createPayment()` for this flow
- Option: add a new method `createPaymentWithStripe(bookingRequestId)` used by `PaymentForm`, keeping the existing mock for dev toggles if needed

4) Keep `PaymentSummary` and related UI
- Keep calculations in UI for display only; server is source of truth for the charge amount

---

## Minimal Code Skeletons (for reference)

1) `create-payment-intent` (Deno, ESM)

```ts
// supabase/functions/create-payment-intent/index.ts
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20", // Example api version
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return new Response("Unauthorized", { status: 401 });

  const { bookingRequestId } = await req.json();
  if (!bookingRequestId) return new Response("Missing bookingRequestId", { status: 400 });

  // Load booking request and validate ownership/approval
  const { data: br, error: brErr } = await supabase
    .from("booking_requests")
    .select("id, renter_id, equipment:equipment(owner_id), total_amount, status")
    .eq("id", bookingRequestId)
    .single();
  if (brErr || !br) return new Response("Booking not found", { status: 404 });
  if (br.renter_id !== user.id) return new Response("Forbidden", { status: 403 });
  // Allow payment on pending requests; do not require owner approval

  // Idempotency: prevent multiple successful payments
  const { data: existingSucceeded } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_request_id", bookingRequestId)
    .eq("payment_status", "succeeded")
    .limit(1);
  if (existingSucceeded && existingSucceeded.length > 0) {
    return new Response(JSON.stringify({ error: "Already paid" }), { status: 409 });
  }

  // Compute amounts (mirror src/lib/payment.ts)
  const subtotal = Number(br.total_amount);
  const service_fee = Number((subtotal * 0.05).toFixed(2));
  const tax = 0;
  const total = Number((subtotal + service_fee + tax).toFixed(2));

  // Create PaymentIntent
  const pi = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      booking_request_id: br.id,
      renter_id: br.renter_id,
      owner_id: br.equipment?.owner_id ?? "",
    },
  });

 // Upsert pending payment row
  await supabase.from("payments").upsert({
    booking_request_id: br.id,
    renter_id: br.renter_id,
    owner_id: br.equipment?.owner_id ?? "",
    subtotal,
    service_fee,
    tax,
    total_amount: total,
    escrow_amount: total,
    owner_payout_amount: subtotal,
    currency: "usd",
    payment_status: "pending",
    escrow_status: "held",
    stripe_payment_intent_id: pi.id,
  }, { onConflict: "stripe_payment_intent_id" });

  return new Response(JSON.stringify({ clientSecret: pi.client_secret, paymentIntentId: pi.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

2) `stripe-webhook` (Deno, ESM)

```ts
// supabase/functions/stripe-webhook/index.ts
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const charge = (pi.charges?.data?.[0]) as Stripe.Charge | undefined;

    // Update payment state
    await supabase.from("payments").upsert({
      stripe_payment_intent_id: pi.id,
      payment_status: "succeeded",
      failure_reason: null,
      stripe_charge_id: charge?.id ?? null,
    }, { onConflict: "stripe_payment_intent_id" });

    // Approve booking request to trigger booking creation via trigger 013
    const brId = (pi.metadata?.booking_request_id as string) || null;
    if (brId) {
      await supabase
        .from("booking_requests")
        .update({ status: "approved" })
        .eq("id", brId);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await supabase.from("payments").upsert({
      stripe_payment_intent_id: pi.id,
      payment_status: "failed",
      failure_reason: pi.last_payment_error?.message ?? "Unknown",
    }, { onConflict: "stripe_payment_intent_id" });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
```

3) `process-refund` (Deno, ESM — full refund MVP)

```ts
// supabase/functions/process-refund/index.ts
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { paymentId, reason } = await req.json();
  if (!paymentId) return new Response("Missing paymentId", { status: 400 });

  // Load payment and ensure caller is involved (renter or owner)
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, renter_id, owner_id, stripe_payment_intent_id, total_amount")
    .eq("id", paymentId)
    .single();
  if (error || !payment) return new Response("Not Found", { status: 404 });
  if (payment.renter_id !== user.id && payment.owner_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Create full refund
  await stripe.refunds.create({ payment_intent: payment.stripe_payment_intent_id! });

  // Update DB
  await supabase
    .from("payments")
    .update({
      payment_status: "refunded",
      escrow_status: "refunded",
      refund_amount: payment.total_amount,
      refund_reason: reason ?? "",
    })
    .eq("id", paymentId);

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
```

---

## Wiring Frontend

1) Update `src/lib/stripe.ts`
- Replace mocked `createPaymentIntent()` with a real call:

```ts
// src/lib/stripe.ts (snippet)
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";

export const createPaymentIntent = async (
  bookingRequestId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;

  const res = await fetch("/functions/v1/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ bookingRequestId }),
  });
  if (!res.ok) throw new Error(`Failed to create intent: ${res.status}`);
  return res.json();
};
```

2) Refactor `src/components/payment/PaymentForm.tsx`
- Remove manual card inputs. Use Elements:
  - On open: call `createPaymentIntent(bookingRequestId)` and store `clientSecret`
  - Wrap in `<Elements stripe={await getStripe()} options={{ clientSecret }}>`
  - Render `<PaymentElement />`
  - On submit: `stripe.confirmPayment({ elements })`
  - On success: poll `payments` for `stripe_payment_intent_id` until found, then navigate to confirmation page

3) Avoid direct DB insertion
- Replace calls to `usePayment.createPayment()` with the Stripe flow above
- Keep `PaymentSummary` display logic intact

4) Update booking request payment entry point
- Current `BookingRequestCard.tsx` shows “Pay Now” only when `status === 'approved'`. Change it to show for renters when `status === 'pending'` and there is no successful payment.
- Optionally, after creating a booking request in `BookingRequestForm.tsx`, open the payment modal immediately.

---

## Webhook Setup & Dev Flow

Local development (recommended):
- Use Stripe CLI to forward webhooks to your local `stripe-webhook` function URL
- Example: `stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook`
  - Adjust domain/port to your Supabase local functions URL
- Configure the webhook endpoint in Stripe Dashboard for test mode if pointing to a deployed function

Testing cards (examples):
- Visa: `4242 4242 4242 4242`, any future expiry, any CVC/ZIP
- Simulate failures with documented test numbers (Stripe docs)

---

## Acceptance Criteria

- “Pay Now” opens a Stripe Payment Element (no raw card inputs)
- Paying with a valid test card succeeds; within a few seconds user is navigated to `PaymentConfirmation` using a real `payments` row ID
- On success, `booking_requests.status` becomes `approved`, a `bookings` row is created, and availability is blocked (per trigger 013)
- `payments` row contains Stripe identifiers and correct breakdown
- A second payment attempt for the same booking returns a clear error (already paid)
- Refund endpoint callable for a full test refund sets `payment_status` and `escrow_status` to `refunded`

---

## Potential Pitfalls

- Ensure amounts match exactly between frontend display and backend charge (server is source of truth)
- Handle webhook retries idempotently (upserts by `stripe_payment_intent_id`)
- Be careful with CORS for functions if accessing cross-origin
- Do not expose service role keys in the browser
- Confirm `payments` table exists in DB migrations (table creation migration is not present here)

DB creation (if missing): minimal DDL sketch

```sql
-- Create payments table (types per src/lib/database.types.ts)
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_request_id uuid not null references booking_requests(id) on delete cascade,
  renter_id uuid not null references profiles(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_transfer_id text,
  payment_method_id text,
  subtotal numeric(10,2) not null,
  service_fee numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,
  escrow_amount numeric(10,2) not null,
  owner_payout_amount numeric(10,2) not null,
  payment_status text not null default 'pending',
  escrow_status text not null default 'held',
  payout_status text not null default 'pending',
  refund_amount numeric(10,2) default 0,
  refund_reason text,
  currency text not null default 'usd',
  failure_reason text,
  escrow_released_at timestamptz,
  payout_processed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_amounts check (total_amount = subtotal + service_fee + tax),
  constraint valid_escrow check (escrow_amount <= total_amount),
  constraint valid_payout check (owner_payout_amount <= escrow_amount)
);
create index if not exists idx_payments_booking_request on payments(booking_request_id);
create index if not exists idx_payments_renter on payments(renter_id);
create index if not exists idx_payments_owner on payments(owner_id);
create index if not exists idx_payments_status on payments(payment_status);
create index if not exists idx_payments_escrow_status on payments(escrow_status);
create index if not exists idx_payments_payout_status on payments(payout_status);
create index if not exists idx_payments_created_at on payments(created_at desc);
create index if not exists idx_payments_status_created_at on payments(payment_status, created_at desc);

-- updated_at trigger
create or replace function update_payments_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists payments_updated_at_trigger on payments;
create trigger payments_updated_at_trigger before update on payments for each row execute function update_payments_updated_at();
```

---

## Follow-ups (not in MVP)

- Stripe Connect onboarding and owner payouts (`stripe.transfers` or destination charges)
- Real escrow strategy (manual capture + capture window, or platform account hold with transfer on completion)
- Refunds flow and receipts
- Email notifications
- Dispute handling
