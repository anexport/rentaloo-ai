import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";
import type { InsuranceType } from "@/types/booking";

// Stripe publishable key - In production, use environment variable
const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51QzMockPublishableKey"; // Mock key for development

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe instance (singleton pattern)
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Booking data required to create a payment intent
 * This is sent to the Edge Function which stores it in Stripe metadata
 * The booking is only created in the database after payment succeeds
 */
export type PaymentBookingData = {
  equipment_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  insurance_type: InsuranceType;
  insurance_cost: number;
  damage_deposit_amount: number;
};

/**
 * Create a payment intent via Supabase Edge Function
 * 
 * IMPORTANT: This does NOT create a booking in the database!
 * The booking is created by the webhook after payment succeeds.
 * This prevents orphaned bookings if users abandon payment.
 */
export const createPaymentIntent = async (
  bookingData: PaymentBookingData
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  // Get session token
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  if (!token) {
    throw new Error("Authentication required");
  }

  // Get Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }

  // Call Edge Function with booking data
  const response = await fetch(
    `${supabaseUrl}/functions/v1/create-payment-intent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Unknown error",
    }));
    throw new Error(
      errorData.error || `Failed to create payment intent: ${response.status}`
    );
  }

  const data = await response.json();
  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
  };
};

/**
 * Confirm a payment with Stripe
 */
export const confirmPayment = async (
  stripe: Stripe,
  clientSecret: string,
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethodId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Payment confirmation failed",
    };
  }
};

/**
 * Format amount for Stripe (convert to cents)
 */
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Format amount from Stripe (convert from cents)
 */
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
};
