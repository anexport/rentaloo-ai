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
    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Missing bookingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment and booking details
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select(
        `
        id,
        deposit_amount,
        deposit_status,
        stripe_payment_intent_id,
        renter_id,
        owner_id,
        booking_request:booking_requests(
          id,
          renter_id,
          equipment:equipment(owner_id)
        )
      `
      )
      .eq("booking_request_id", bookingId)
      .single();

    if (paymentErr || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner or renter
    const booking = payment.booking_request as {
      id: string;
      renter_id: string;
      equipment: { owner_id: string };
    };
    const isOwner = booking.equipment.owner_id === user.id;
    const isRenter = booking.renter_id === user.id;

    if (!isOwner && !isRenter) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if deposit can be released
    if (!payment.deposit_amount || payment.deposit_amount <= 0) {
      return new Response(
        JSON.stringify({ error: "No deposit to release" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment.deposit_status !== "held") {
      return new Response(
        JSON.stringify({ error: "Deposit already processed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for pending claims
    const { data: pendingClaims } = await supabase
      .from("damage_claims")
      .select("id")
      .eq("booking_id", bookingId)
      .in("status", ["pending", "disputed"]);

    if (pendingClaims && pendingClaims.length > 0) {
      return new Response(
        JSON.stringify({ error: "Cannot release deposit with pending claims" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for return inspection (optional but recommended)
    const { data: returnInspection } = await supabase
      .from("equipment_inspections")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("inspection_type", "return")
      .maybeSingle();

    // Only owners can release without return inspection
    if (!returnInspection && !isOwner) {
      return new Response(
        JSON.stringify({ error: "Return inspection required before deposit release" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atomically move deposit to "releasing" to prevent concurrent refunds
    const {
      data: depositLock,
      error: depositLockErr,
    } = await supabase
      .from("payments")
      .update({ deposit_status: "releasing" })
      .eq("id", payment.id)
      .eq("deposit_status", "held")
      .select("id")
      .maybeSingle();

    if (depositLockErr) {
      console.error("Error locking payment for deposit release:", depositLockErr);
      return new Response(
        JSON.stringify({ error: "Failed to reserve deposit for release" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!depositLock) {
      return new Response(
        JSON.stringify({ error: "Deposit already being released" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process Stripe partial refund for deposit amount only
    try {
      await stripe.refunds.create(
        {
          payment_intent: payment.stripe_payment_intent_id,
          amount: Math.round(payment.deposit_amount * 100), // Convert to cents
          reason: "requested_by_customer",
          metadata: {
            type: "deposit_release",
            booking_id: bookingId,
            released_by: user.id,
          },
        },
        {
          idempotencyKey: `deposit_release_${payment.id}`,
        }
      );
    } catch (stripeError) {
      console.error("Stripe refund error:", stripeError);
      const { error: resetErr } = await supabase
        .from("payments")
        .update({ deposit_status: "held" })
        .eq("id", payment.id)
        .eq("deposit_status", "releasing");
      if (resetErr) {
        console.error("Failed to reset deposit status after Stripe error:", resetErr);
      }
      return new Response(
        JSON.stringify({
          error: "Refund failed",
          message:
            stripeError instanceof Error
              ? stripeError.message
              : "Unknown error",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update payment record
    const { data: releasedPayment, error: updateErr } = await supabase
      .from("payments")
      .update({
        deposit_status: "released",
        deposit_released_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("deposit_status", "releasing")
      .select("id")
      .maybeSingle();

    if (updateErr || !releasedPayment) {
      console.error("Error updating payment after deposit release:", updateErr);
      return new Response(
        JSON.stringify({
          error: "Failed to update payment record",
          message: updateErr ? updateErr.message : "Deposit status not updated",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deposit of $${Number(payment.deposit_amount).toFixed(2)} has been released`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error releasing deposit:", error);
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
