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

// Keep currency math normalized to cents to avoid floating point drift
const roundToTwo = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

// Type for booking data passed from frontend
interface BookingData {
  equipment_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  insurance_type: string;
  insurance_cost: number;
  damage_deposit_amount: number;
}

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

    // Parse request body - now accepts booking data directly
    const body = await req.json();
    const bookingData = body as BookingData;

    // Validate required fields
    if (!bookingData.equipment_id) {
      return new Response(
        JSON.stringify({ error: "Missing equipment_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!bookingData.start_date || !bookingData.end_date) {
      return new Response(
        JSON.stringify({ error: "Missing rental dates" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!bookingData.total_amount || bookingData.total_amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid total amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get equipment details and verify it exists
    const { data: equipment, error: equipError } = await supabase
      .from("equipment")
      .select("id, owner_id, daily_rate, is_available, title")
      .eq("id", bookingData.equipment_id)
      .single();

    if (equipError || !equipment) {
      return new Response(JSON.stringify({ error: "Equipment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is not booking their own equipment
    if (equipment.owner_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot book your own equipment" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check equipment is available
    if (!equipment.is_available) {
      return new Response(
        JSON.stringify({ error: "Equipment is not available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check availability for the dates - NO booking ID to exclude since no booking exists yet
    const { data: isAvailable, error: conflictError } = await supabase.rpc(
      "check_booking_conflicts",
      {
        p_equipment_id: bookingData.equipment_id,
        p_start_date: bookingData.start_date,
        p_end_date: bookingData.end_date,
        p_exclude_booking_id: null, // No booking to exclude
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

    if (isAvailable === false) {
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

    // Calculate breakdown from total
    const bookingTotal = Number(bookingData.total_amount);
    const insuranceAmount = roundToTwo(Number(bookingData.insurance_cost ?? 0));
    const depositAmount = roundToTwo(Number(bookingData.damage_deposit_amount ?? 0));
    const subtotalBeforeFees = roundToTwo(
      bookingTotal - insuranceAmount - depositAmount
    );

    if (!Number.isFinite(subtotalBeforeFees) || subtotalBeforeFees < 0) {
      console.error("Booking totals are inconsistent", {
        bookingTotal,
        insuranceAmount,
        depositAmount,
      });
      return new Response(
        JSON.stringify({
          error: "Booking totals are invalid. Please try again.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rentalSubtotal = roundToTwo(subtotalBeforeFees / 1.05);
    const serviceFee = roundToTwo(subtotalBeforeFees - rentalSubtotal);

    // Create PaymentIntent with ALL booking data in metadata
    // This data will be used by the webhook to create the booking after payment
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(bookingTotal * 100), // Convert to cents
      currency: "usd",
      metadata: {
        // All data needed to create booking after payment
        equipment_id: bookingData.equipment_id,
        renter_id: user.id,
        owner_id: equipment.owner_id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        total_amount: bookingTotal.toString(),
        rental_amount: rentalSubtotal.toString(),
        service_fee: serviceFee.toString(),
        insurance_type: bookingData.insurance_type || "none",
        insurance_cost: insuranceAmount.toString(),
        damage_deposit_amount: depositAmount.toString(),
        equipment_title: equipment.title || "",
      },
    });

    // DO NOT create any database records here
    // The booking and payment will be created by the webhook after payment success
    // This prevents orphaned bookings if user abandons payment

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
