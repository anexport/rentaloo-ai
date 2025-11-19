import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe, createPaymentIntent } from "@/lib/stripe";
import { calculatePaymentSummary } from "@/lib/payment";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CreditCard, Lock, Loader2 } from "lucide-react";
import PaymentSummary from "./PaymentSummary";

interface PaymentFormProps {
  bookingRequestId: string;
  ownerId: string;
  totalAmount: number;
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void | Promise<void>;
  isCancelling?: boolean;
}

interface PaymentFormInnerProps extends PaymentFormProps {
  paymentIntentId: string;
}

const PaymentFormInner = ({
  bookingRequestId,
  ownerId,
  totalAmount,
  onSuccess,
  onCancel,
  paymentIntentId,
  isCancelling = false,
}: PaymentFormInnerProps) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingData, setBookingData] = useState<{
    subtotal: number;
    insurance: number;
    deposit: number;
    insuranceType: string;
  } | null>(null);

  // Fetch booking request data to get correct breakdown
  useEffect(() => {
    const fetchBookingData = async () => {
      const { data: booking, error } = await supabase
        .from("booking_requests")
        .select("total_amount, insurance_cost, damage_deposit_amount, insurance_type, start_date, end_date, equipment:equipment_id(daily_rate)")
        .eq("id", bookingRequestId)
        .single();

      if (error) {
        console.error("Error fetching booking data:", error);
        return;
      }

      if (booking && booking.equipment) {
        // Calculate subtotal by working backwards from total
        const insuranceCost = booking.insurance_cost || 0;
        const depositAmount = booking.damage_deposit_amount || 0;
        const serviceFee = (booking.total_amount - insuranceCost - depositAmount) * 0.05 / 1.05;
        const subtotal = booking.total_amount - insuranceCost - depositAmount - serviceFee;

        setBookingData({
          subtotal,
          insurance: insuranceCost,
          deposit: depositAmount,
          insuranceType: booking.insurance_type || "none",
        });
      }
    };

    void fetchBookingData();
  }, [bookingRequestId]);

  const paymentSummary = bookingData
    ? calculatePaymentSummary(
        bookingData.subtotal,
        0.05, // 5% service fee
        0, // no tax
        bookingData.insurance,
        bookingData.deposit
      )
    : calculatePaymentSummary(totalAmount, 0, 0, 0, 0); // Fallback to totalAmount as subtotal if no booking data yet

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is not initialized. Please refresh the page.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm payment with Stripe
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/confirmation?payment_intent_id=${paymentIntentId}`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Payment succeeded - poll for payment record
      if (!paymentIntentId) {
        setError("Payment Intent ID not found");
        setIsProcessing(false);
        return;
      }

      // Poll for payment record (up to 10 seconds with backoff)
      const maxAttempts = 20;
      const pollInterval = 500; // 500ms

      const pollPayment = async (): Promise<string | null> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          const { data: payment, error: fetchError } = await supabase
            .from("payments")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .eq("payment_status", "succeeded")
            .maybeSingle();

          if (payment) {
            return payment.id;
          }

          if (fetchError && fetchError.code !== "PGRST116") {
            // PGRST116 is "not found" which is expected during polling
            console.error("Error polling payment:", fetchError);
          }
        }
        return null;
      };

      const paymentId = await pollPayment();

      if (paymentId) {
        // Navigate to confirmation page
        void navigate(`/payment/confirmation?payment_id=${paymentId}`);
        onSuccess?.(paymentId);
      } else {
        // Payment succeeded but record not found yet
        // Still navigate but show warning
        setError(
          "Payment succeeded but confirmation is pending. Please check your payment status."
        );
        // Still navigate after a short delay
        setTimeout(() => {
          void navigate(
            `/payment/confirmation?payment_intent_id=${paymentIntentId}`
          );
        }, 2000);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again or use a different payment method."
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>
            Enter your card details to complete the booking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start space-x-2">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Your payment information is encrypted and secure. We use Stripe
                for payment processing.
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Stripe Payment Element */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <PaymentElement />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isProcessing || isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!stripe || isProcessing || isCancelling}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${paymentSummary.total.toFixed(2)}`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div>
        <PaymentSummary
          summary={paymentSummary}
          insuranceType={bookingData?.insuranceType as "none" | "basic" | "premium" | undefined}
        />

        {/* Additional Info */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium">Payment Protection</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Funds held in escrow until rental completion</li>
                <li>Owner receives payment after successful return</li>
                <li>Full refund if equipment not as described</li>
                <li>24/7 customer support for payment issues</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PaymentForm = ({
  bookingRequestId,
  ownerId,
  totalAmount,
  onSuccess,
  onCancel,
  isCancelling = false,
}: PaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<
    import("@stripe/stripe-js").Stripe | null
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const currentBookingRequestIdRef = useRef<string | null>(null);

  // Reset refs when bookingRequestId changes
  useEffect(() => {
    if (currentBookingRequestIdRef.current !== bookingRequestId) {
      currentBookingRequestIdRef.current = bookingRequestId;
      isInitializingRef.current = false;
      hasInitializedRef.current = false;
    }
  }, [bookingRequestId]);

  useEffect(() => {
    // Prevent duplicate payment intent creation
    if (isInitializingRef.current || hasInitializedRef.current) {
      return;
    }

    const initializePayment = async () => {
      // Mark as initializing to prevent concurrent calls
      isInitializingRef.current = true;

      try {
        setLoading(true);
        setError(null);

        // Initialize Stripe
        const stripe = getStripe();
        setStripePromise(stripe);

        // Create payment intent via Edge Function
        const { clientSecret: secret, paymentIntentId: intentId } =
          await createPaymentIntent(bookingRequestId);

        setClientSecret(secret);
        setPaymentIntentId(intentId);
        
        // Mark as initialized to prevent re-initialization
        hasInitializedRef.current = true;
      } catch (err) {
        console.error("Error initializing payment:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize payment. Please try again."
        );
        // Reset on error so user can retry
        isInitializingRef.current = false;
      } finally {
        setLoading(false);
        isInitializingRef.current = false;
      }
    };

    void initializePayment();
  }, [bookingRequestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Initializing payment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret || !paymentIntentId || !stripePromise) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to initialize payment. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <PaymentFormInner
        bookingRequestId={bookingRequestId}
        ownerId={ownerId}
        totalAmount={totalAmount}
        onSuccess={onSuccess}
        onCancel={onCancel}
        paymentIntentId={paymentIntentId}
        isCancelling={isCancelling}
      />
    </Elements>
  );
};

export default PaymentForm;
