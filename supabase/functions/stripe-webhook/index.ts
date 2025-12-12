import Stripe from "npm:stripe@13.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is required");
}

// CORS headers (for webhook, not strictly necessary but good practice)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper to safely parse metadata numbers
const parseMetadataNumber = (value: string | undefined, defaultValue = 0): number => {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle payment_intent.succeeded
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const charge = (pi.charges?.data?.[0]) as Stripe.Charge | undefined;
      const metadata = pi.metadata || {};

      console.log("Processing successful payment:", {
        paymentIntentId: pi.id,
        metadata,
      });

      // Extract booking data from metadata
      const equipmentId = metadata.equipment_id;
      const renterId = metadata.renter_id;
      const ownerId = metadata.owner_id;
      const startDate = metadata.start_date;
      const endDate = metadata.end_date;
      const totalAmount = parseMetadataNumber(metadata.total_amount);
      const rentalAmount = parseMetadataNumber(metadata.rental_amount);
      const serviceFee = parseMetadataNumber(metadata.service_fee);
      const insuranceType = metadata.insurance_type || "none";
      const insuranceCost = parseMetadataNumber(metadata.insurance_cost);
      const depositAmount = parseMetadataNumber(metadata.damage_deposit_amount);
      const equipmentTitle = metadata.equipment_title || "";

      // Validate required metadata
      if (!equipmentId || !renterId || !ownerId || !startDate || !endDate) {
        console.error("Missing required metadata in PaymentIntent:", {
          equipmentId,
          renterId,
          ownerId,
          startDate,
          endDate,
        });
        // Still return 200 to acknowledge receipt - we can investigate manually
        return new Response(
          JSON.stringify({ received: true, warning: "Missing metadata" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if booking already exists for this payment intent (idempotency)
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id, booking_request_id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (existingPayment) {
        console.log("Payment already processed:", existingPayment.id);
        // Update payment status if needed
        await supabase
          .from("payments")
          .update({
            payment_status: "succeeded",
            stripe_charge_id: charge?.id ?? null,
          })
          .eq("id", existingPayment.id);

        return new Response(
          JSON.stringify({ received: true, existing: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create the booking_request with "approved" status (already paid)
      const { data: newBooking, error: bookingError } = await supabase
        .from("booking_requests")
        .insert({
          equipment_id: equipmentId,
          renter_id: renterId,
          start_date: startDate,
          end_date: endDate,
          total_amount: totalAmount,
          status: "approved", // Immediately approved since payment succeeded
          insurance_type: insuranceType,
          insurance_cost: insuranceCost,
          damage_deposit_amount: depositAmount,
          message: null,
        })
        .select("id")
        .single();

      if (bookingError || !newBooking) {
        console.error("Error creating booking request:", bookingError);
        // Return 200 to prevent Stripe retries - we need to investigate manually
        return new Response(
          JSON.stringify({
            received: true,
            error: "Failed to create booking",
            details: bookingError?.message,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Created booking request:", newBooking.id);

      // Create the payment record
      const { data: newPayment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_request_id: newBooking.id,
          renter_id: renterId,
          owner_id: ownerId,
          stripe_payment_intent_id: pi.id,
          stripe_charge_id: charge?.id ?? null,
          subtotal: rentalAmount,
          rental_amount: rentalAmount,
          service_fee: serviceFee,
          tax: 0,
          insurance_amount: insuranceCost,
          deposit_amount: depositAmount,
          total_amount: totalAmount,
          escrow_amount: totalAmount,
          owner_payout_amount: rentalAmount,
          currency: "usd",
          payment_status: "succeeded",
          escrow_status: "held",
          deposit_status: depositAmount > 0 ? "held" : null,
        })
        .select("id")
        .single();

      if (paymentError) {
        console.error("Error creating payment record:", paymentError);
        // Booking was created but payment record failed - still need to handle
      } else {
        console.log("Created payment record:", newPayment?.id);
      }

      // Create conversation and send confirmation message
      try {
        // Check if conversation exists
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("booking_request_id", newBooking.id)
          .maybeSingle();

        let conversationId = existingConv?.id;

        // Create conversation if it doesn't exist
        if (!conversationId) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              booking_request_id: newBooking.id,
              participants: [renterId, ownerId],
            })
            .select("id")
            .single();

          conversationId = newConv?.id;

          // Add conversation participants
          if (conversationId) {
            await supabase.from("conversation_participants").insert([
              { conversation_id: conversationId, profile_id: renterId },
              { conversation_id: conversationId, profile_id: ownerId },
            ]);
          }
        }

        // Send payment confirmation message
        if (conversationId) {
          const startDateFormatted = new Date(startDate).toLocaleDateString();
          const endDateFormatted = new Date(endDate).toLocaleDateString();

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: renterId,
            content: `Payment confirmed! I've booked your "${equipmentTitle}" from ${startDateFormatted} to ${endDateFormatted} ($${totalAmount.toFixed(2)} total).`,
            message_type: "booking_approved",
          });
        }
      } catch (convError) {
        console.error("Error creating conversation after payment:", convError);
        // Don't fail the webhook - booking and payment are still valid
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;

      // Since we don't create booking/payment until success, nothing to update here
      // Just log for debugging
      console.log("Payment failed:", {
        paymentIntentId: pi.id,
        error: pi.last_payment_error?.message,
      });

      // If there was an existing payment record (from old flow), update it
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          payment_status: "failed",
          failure_reason:
            (pi.last_payment_error?.message as string) || "Unknown",
        })
        .eq("stripe_payment_intent_id", pi.id);

      if (updateError) {
        console.error("Error updating failed payment:", updateError);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
