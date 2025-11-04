import { loadStripe, type Stripe } from "@stripe/stripe-js";

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
 * Create a payment intent via backend API
 * In production, this would call your backend endpoint
 */
export const createPaymentIntent = async (
  amount: number,
  bookingRequestId: string,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  void amount;
  void bookingRequestId;
  void metadata;
  // In production, call your backend API endpoint:
  // const response = await fetch('/api/payments/create-intent', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ amount, bookingRequestId, metadata }),
  // });
  //
  // const data = await response.json();
  // return data;

  // For MVP, return mock data
  return {
    clientSecret: `pi_mock_${Date.now()}_secret_${Math.random()
      .toString(36)
      .substring(7)}`,
    paymentIntentId: `pi_mock_${Date.now()}`,
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
