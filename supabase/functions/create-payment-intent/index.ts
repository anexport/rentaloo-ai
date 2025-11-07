import Stripe from "npm:stripe@13.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { bookingRequestId } = await req.json();
    if (!bookingRequestId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingRequestId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load booking request and validate ownership
    const { data: br, error: brErr } = await supabase
      .from("booking_requests")
      .select(
        "id, renter_id, total_amount, status, start_date, end_date, equipment:equipment(id, owner_id)"
      )
      .eq("id", bookingRequestId)
      .single();

    if (brErr || !br) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is the renter
    if (br.renter_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner_id from equipment
    const ownerId = (br.equipment as { owner_id?: string })?.owner_id || null;
    if (!ownerId) {
      return new Response(
        JSON.stringify({ error: "Equipment owner not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check availability one more time before creating payment intent
    // This prevents race conditions where multiple users try to book same dates
    // Exclude the current booking_request_id so it doesn't conflict with itself
    const { data: conflictCheck, error: conflictError } = await supabase.rpc(
      "check_booking_conflicts",
      {
        p_equipment_id: (br.equipment as { id: string }).id,
        p_start_date: br.start_date,
        p_end_date: br.end_date,
        p_exclude_booking_id: br.id, // Exclude current booking request
      }
    );

    if (conflictError) {
      console.error("Error checking availability:", conflictError);
      return new Response(
        JSON.stringify({
          error: "Unable to verify availability. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (conflictCheck === false) {
      return new Response(
        JSON.stringify({
          error:
            "These dates are no longer available. Please select different dates.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Idempotency: prevent multiple successful payments
    const { data: existingSucceeded } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_request_id", bookingRequestId)
      .eq("payment_status", "succeeded")
      .limit(1);

    if (existingSucceeded && existingSucceeded.length > 0) {
      return new Response(
        JSON.stringify({ error: "Payment already completed" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for existing pending payment with PaymentIntent
    const { data: existingPending } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("booking_request_id", bookingRequestId)
      .eq("payment_status", "pending")
      .not("stripe_payment_intent_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (existingPending?.stripe_payment_intent_id) {
      try {
        // Try to retrieve existing PaymentIntent
        const existingPi = await stripe.paymentIntents.retrieve(
          existingPending.stripe_payment_intent_id
        );

        if (
          existingPi.status !== "canceled" &&
          existingPi.status !== "succeeded"
        ) {
          // Return existing client secret
          return new Response(
            JSON.stringify({
              clientSecret: existingPi.client_secret,
              paymentIntentId: existingPi.id,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (err) {
        // PaymentIntent not found or invalid, continue to create new one
        console.error("Error retrieving existing PaymentIntent:", err);
      }
    }

    // Calculate payment breakdown (mirror src/lib/payment.ts)
    const subtotal = Number(br.total_amount);
    const service_fee = Number((subtotal * 0.05).toFixed(2));
    const tax = 0;
    const total = Number((subtotal + service_fee + tax).toFixed(2));

    // Create PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: "usd",
      metadata: {
        booking_request_id: br.id,
        renter_id: br.renter_id,
        owner_id: ownerId,
      },
    });

    // Upsert pending payment row
    // First check if payment exists for this booking_request_id
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_request_id", br.id)
      .eq("payment_status", "pending")
      .maybeSingle();

    if (existingPayment) {
      // Update existing payment with new PaymentIntent
      const { data: updateData, error: updateError } = await supabase
        .from("payments")
        .update({
          stripe_payment_intent_id: pi.id,
          subtotal,
          service_fee,
          tax,
          total_amount: total,
          escrow_amount: total,
          owner_payout_amount: subtotal,
        })
        .eq("id", existingPayment.id);

      if (updateError) {
        console.error("Failed to update payment record:", updateError);
        return new Response(
          JSON.stringify({
            error: "Failed to update payment record",
            details: updateError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // Insert new payment row
      const { data: insertData, error: insertError } = await supabase
        .from("payments")
        .insert({
          booking_request_id: br.id,
          renter_id: br.renter_id,
          owner_id: ownerId,
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
        });

      if (insertError) {
        console.error("Failed to insert payment record:", insertError);
        return new Response(
          JSON.stringify({
            error: "Failed to create payment record",
            details: insertError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
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
