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

      // Update payment state
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          payment_status: "succeeded",
          failure_reason: null,
          stripe_charge_id: charge?.id ?? null,
        })
        .eq("stripe_payment_intent_id", pi.id);

      if (updateError) {
        console.error("Error updating payment:", updateError);
        // Don't fail the webhook, Stripe will retry
      }

      // Approve booking request to trigger booking creation via trigger 013
      const brId = (pi.metadata?.booking_request_id as string) || null;
      if (brId) {
        const { error: bookingError } = await supabase
          .from("booking_requests")
          .update({ status: "approved" })
          .eq("id", brId);

        if (bookingError) {
          console.error("Error approving booking request:", bookingError);
          // Don't fail the webhook
        }

        // After approving booking request, create conversation and send confirmation message
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
            const ownerId = (bookingRequest.equipment as { owner_id: string }).owner_id;
            
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
              const equipmentTitle = (bookingRequest.equipment as { title: string }).title;
              
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: bookingRequest.renter_id,
                content: `Payment confirmed! I've booked your "${equipmentTitle}" from ${startDate} to ${endDate} ($${bookingRequest.total_amount.toFixed(2)} total).`,
                message_type: "booking_approved"
              });
            }
          }
        } catch (convError) {
          console.error("Error creating conversation after payment:", convError);
          // Don't fail the webhook - booking is still valid
        }
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;

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

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

